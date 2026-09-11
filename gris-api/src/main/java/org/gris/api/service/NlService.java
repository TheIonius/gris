package org.gris.api.service;

import org.gris.api.model.NlAskRequest;
import org.gris.api.model.NlAskResponse;
import org.gris.api.model.ScenarioCreateRequest;
import org.gris.api.model.ScenarioResponse;
import org.gris.core.model.ModelRegistry;
import org.gris.nl.model.NlParseResult;
import org.gris.nl.parser.ScenarioPromptParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NlService {

    private static final Logger log = LoggerFactory.getLogger(NlService.class);

    private final ScenarioPromptParser promptParser;
    private final ModelRegistry modelRegistry;
    private final ScenarioService scenarioService;

    public NlService(
            ScenarioPromptParser promptParser,
            ModelRegistry modelRegistry,
            ScenarioService scenarioService
    ) {
        this.promptParser = promptParser;
        this.modelRegistry = modelRegistry;
        this.scenarioService = scenarioService;
    }

    public NlAskResponse processPrompt(NlAskRequest request) {
        log.info("Processing NL prompt: '{}' (execute={})", request.prompt(), request.shouldExecute());

        ComparisonPair comparison = tryDetectComparison(request.prompt());
        if (comparison != null) {
            log.info("Detected comparative prompt. Branch A: '{}' | Branch B: '{}'", comparison.promptA(), comparison.promptB());
            NlAskResponse respA = processSinglePrompt(comparison.promptA(), request.shouldExecute());
            NlAskResponse respB = processSinglePrompt(comparison.promptB(), request.shouldExecute());

            if (respA.valid() && respB.valid()) {
                String reasoning = comparison.summary() + ". Domain: " + respA.modelType() + ". " +
                        (request.shouldExecute()
                                ? "Simultaneous dual-run execution initiated for policy comparison."
                                : "Side-by-side comparative simulation specification created.");
                return NlAskResponse.comparison(request.prompt(), respA, respB, reasoning);
            }
        }

        return processSinglePrompt(request.prompt(), request.shouldExecute());
    }

    private NlAskResponse processSinglePrompt(String promptText, boolean shouldExecute) {
        NlParseResult parseResult = promptParser.parse(promptText, modelRegistry);

        ScenarioResponse scenarioResponse = null;
        if (shouldExecute && parseResult.valid()) {
            ScenarioCreateRequest createReq = new ScenarioCreateRequest(
                    parseResult.suggestedName(),
                    parseResult.description(),
                    parseResult.modelType(),
                    parseResult.horizon(),
                    parseResult.replications(),
                    parseResult.seed(),
                    parseResult.parameters()
            );
            scenarioResponse = scenarioService.submitScenario(createReq);
            log.info("Submitted scenario {} via natural language interface", scenarioResponse.id());
        }

        return NlAskResponse.single(
                parseResult.rawPrompt(),
                parseResult.modelType(),
                parseResult.suggestedName(),
                parseResult.description(),
                parseResult.horizon(),
                parseResult.replications(),
                parseResult.seed(),
                parseResult.parameters(),
                parseResult.confidence(),
                parseResult.reasoning(),
                parseResult.warnings(),
                parseResult.valid(),
                scenarioResponse
        );
    }

    private record ComparisonPair(String promptA, String promptB, String summary) {}

    private ComparisonPair tryDetectComparison(String rawPrompt) {
        if (rawPrompt == null || rawPrompt.isBlank()) return null;
        String clean = rawPrompt.trim();

        // Match compare prefixes: compare, comparison of, evaluate, etc.
        Pattern comparePrefix = Pattern.compile("^(?:please\\s+)?(?:what\\s+if\\s+we\\s+)?(?:compare|comparison\\s+between|comparison\\s+of|evaluate|run\\s+comparison\\s+between)\\s+", Pattern.CASE_INSENSITIVE);
        String body = comparePrefix.matcher(clean).replaceFirst("");

        // Pattern matching: "<partA> vs <partB>" or "<partA> versus <partB>"
        Pattern vsPattern = Pattern.compile("^(.*?)\\s+(?:vs\\.?|versus)\\s+(.*?)$", Pattern.CASE_INSENSITIVE);
        Matcher matcher = vsPattern.matcher(body);
        if (!matcher.matches()) {
            return null;
        }

        String partA = matcher.group(1).trim();
        String partB = matcher.group(2).trim();

        // Remove trailing question marks or punctuation
        partB = partB.replaceAll("[?.!]+$", "").trim();

        if (partA.isEmpty() || partB.isEmpty()) return null;

        String resolvedA = partA;
        String resolvedB = partB;

        // Context distribution between A and B
        // Look for common prepositional phrases in B like "with 400 vehicles", "in Caucedo"
        Pattern prepTailPattern = Pattern.compile("^(.*?)\\s+((?:with|in|at|for|under|using)\\s+.+)$", Pattern.CASE_INSENSITIVE);
        Matcher prepMatcherB = prepTailPattern.matcher(partB);

        if (prepMatcherB.matches()) {
            String coreB = prepMatcherB.group(1).trim();
            String tailB = prepMatcherB.group(2).trim();
            String lowerA = partA.toLowerCase();

            // If coreB has words beyond the first (e.g. "Batched dispatch"), share the qualifier (e.g. "dispatch")
            String[] coreWordsB = coreB.split("\\s+");
            StringBuilder extraQualifiers = new StringBuilder();
            if (coreWordsB.length > 1) {
                for (int i = 1; i < coreWordsB.length; i++) {
                    if (!lowerA.contains(coreWordsB[i].toLowerCase())) {
                        extraQualifiers.append(" ").append(coreWordsB[i]);
                    }
                }
            }

            if (!lowerA.contains(" with ") && !lowerA.contains(" in ") && !lowerA.contains(" at ") && !lowerA.contains(" for ")) {
                resolvedA = partA + extraQualifiers + " " + tailB;
            }
        } else {
            String[] wordsA = partA.split("\\s+");
            String[] wordsB = partB.split("\\s+");
            if (wordsB.length > wordsA.length && wordsA.length <= 2) {
                StringBuilder suffix = new StringBuilder();
                for (int i = wordsA.length; i < wordsB.length; i++) {
                    if (!suffix.isEmpty()) suffix.append(" ");
                    suffix.append(wordsB[i]);
                }
                resolvedA = partA + " " + suffix;
            } else if (wordsA.length > wordsB.length && wordsB.length <= 2) {
                StringBuilder prefix = new StringBuilder();
                for (int i = 0; i < wordsA.length - wordsB.length; i++) {
                    if (!prefix.isEmpty()) prefix.append(" ");
                    prefix.append(wordsA[i]);
                }
                resolvedB = prefix + " " + partB;
            }
        }

        String summary = "Policy comparison: '" + partA + "' vs. '" + partB + "'";
        return new ComparisonPair(resolvedA, resolvedB, summary);
    }
}
