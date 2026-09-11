package org.gris.nl.parser;

import org.gris.core.model.ModelRegistry;
import org.gris.nl.model.NlParseResult;
import org.gris.nl.model.ValidationReport;
import org.gris.nl.validator.ScenarioBoundsValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Semantic prompt parser with domain classification, entity extraction,
 * and parameter mapping for simulation models.
 */
public class SemanticPromptParser implements ScenarioPromptParser {

    private static final Logger log = LoggerFactory.getLogger(SemanticPromptParser.class);
    private final ScenarioBoundsValidator validator = new ScenarioBoundsValidator();

    // Domain keywords
    private static final Set<String> TERMINAL_KEYWORDS = Set.of(
            "caucedo", "terminal", "vessel", "vessels", "berth", "berths",
            "quay", "crane", "cranes", "sts", "container", "containers",
            "ship", "ships", "gmph", "moves", "port"
    );

    private static final Set<String> MOBILITY_KEYWORDS = Set.of(
            "taxi", "taxis", "vehicle", "vehicles", "fleet", "dispatch",
            "brooklyn", "manhattan", "queens", "jfk", "lga", "surge",
            "trip", "trips", "passenger", "passengers", "tlc", "cab", "cabs"
    );

    private static final Set<String> MM1_KEYWORDS = Set.of(
            "mm1", "m/m/1", "queue", "queueing", "queuing", "arrival rate",
            "service rate", "poisson", "exponential", "lambda", "mu",
            "single-server", "multi-server"
    );

    @Override
    public NlParseResult parse(String prompt, ModelRegistry registry) {
        if (prompt == null || prompt.isBlank()) {
            return NlParseResult.builder()
                    .rawPrompt("")
                    .modelType("unknown")
                    .confidence(0.0)
                    .reasoning("Prompt was empty")
                    .valid(false)
                    .warnings(List.of("Empty prompt received"))
                    .build();
        }

        String lower = prompt.toLowerCase(Locale.ROOT);
        String domain = classifyDomain(lower);
        double horizon = extractHorizon(lower, domain);
        int reps = extractReplications(lower);
        Long seed = extractSeed(lower);

        Map<String, Object> params = new LinkedHashMap<>();
        StringBuilder reasoning = new StringBuilder();
        double confidence = 0.90;

        String suggestedName;
        String description;

        switch (domain) {
            case "caucedo-terminal" -> {
                extractTerminalParameters(lower, params, reasoning);
                suggestedName = "Caucedo Terminal Scenario: " + summarizeTerminal(params);
                description = "Simulation of container terminal operations at DP World Caucedo with "
                        + params.getOrDefault("quayCranes", 8) + " quay cranes, "
                        + params.getOrDefault("berths", 3) + " berths, and "
                        + params.getOrDefault("cranePolicy", "DYNAMIC") + " allocation policy.";
            }
            case "mobility-dispatch" -> {
                extractMobilityParameters(lower, params, reasoning);
                suggestedName = "NYC Mobility Scenario: " + summarizeMobility(params);
                description = "Urban vehicle fleet dispatch across NYC TLC zones with "
                        + params.getOrDefault("fleetSize", 400) + " vehicles under "
                        + params.getOrDefault("policy", "NEAREST") + " dispatch policy.";
            }
            default -> {
                domain = "mm1-queue";
                extractMM1Parameters(lower, params, reasoning);
                suggestedName = "Queueing Scenario: lambda=" + params.getOrDefault("lambda", 0.5)
                        + ", mu=" + params.getOrDefault("mu", 1.0);
                description = "M/M/" + params.getOrDefault("servers", 1) + " queueing simulation with arrival rate lambda="
                        + params.getOrDefault("lambda", 0.5) + " and service rate mu=" + params.getOrDefault("mu", 1.0) + ".";
            }
        }

        // Schema and bounds validation
        ValidationReport report = validator.validate(domain, horizon, reps, params, registry);
        List<String> combinedWarnings = new ArrayList<>(report.warnings());
        if (!report.valid()) {
            combinedWarnings.addAll(report.errors());
            confidence = Math.min(confidence, 0.40);
        }

        return NlParseResult.builder()
                .rawPrompt(prompt)
                .modelType(domain)
                .suggestedName(suggestedName)
                .description(description)
                .horizon(horizon)
                .replications(reps)
                .seed(seed)
                .parameters(params)
                .confidence(confidence)
                .reasoning(reasoning.toString().trim())
                .warnings(combinedWarnings)
                .valid(report.valid())
                .build();
    }

    private String classifyDomain(String text) {
        int terminalScore = scoreKeywords(text, TERMINAL_KEYWORDS);
        int mobilityScore = scoreKeywords(text, MOBILITY_KEYWORDS);
        int mm1Score = scoreKeywords(text, MM1_KEYWORDS);

        if (terminalScore > mobilityScore && terminalScore > mm1Score) return "caucedo-terminal";
        if (mobilityScore > terminalScore && mobilityScore > mm1Score) return "mobility-dispatch";
        if (mm1Score > 0) return "mm1-queue";

        // Heuristics for ambiguous prompts
        if (text.contains("crane") || text.contains("vessel") || text.contains("berth")) return "caucedo-terminal";
        if (text.contains("car") || text.contains("ride") || text.contains("driver") || text.contains("fleet")) return "mobility-dispatch";
        return "mm1-queue";
    }

    private int scoreKeywords(String text, Set<String> keywords) {
        int score = 0;
        for (String kw : keywords) {
            if (text.contains(kw)) {
                score += kw.length() > 4 ? 2 : 1;
            }
        }
        return score;
    }

    private double extractHorizon(String text, String domain) {
        Matcher m = Pattern.compile("(\\d+(\\.\\d+)?)\\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s|weeks?|w)\\b").matcher(text);
        if (m.find()) {
            double val = Double.parseDouble(m.group(1));
            String unit = m.group(3);
            if (unit.startsWith("w")) return val * 7 * 86400.0;
            if (unit.startsWith("d")) return val * 86400.0;
            if (unit.startsWith("h")) return val * 3600.0;
            if (unit.startsWith("m") && !unit.startsWith("s")) return val * 60.0;
            return val;
        }

        // Domain defaults
        return switch (domain) {
            case "caucedo-terminal" -> 7 * 86400.0; // 7 days default
            case "mobility-dispatch" -> 7200.0;      // 2 hours default
            default -> 15000.0;                      // 15,000s default for M/M/1
        };
    }

    private int extractReplications(String text) {
        Matcher m = Pattern.compile("(\\d+)\\s*(replications?|reps?|runs?|trials?|iterations?|seeds?)\\b").matcher(text);
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        m = Pattern.compile("(run|simulate)\\s+(\\d+)\\s+times").matcher(text);
        if (m.find()) {
            return Integer.parseInt(m.group(2));
        }
        return 10;
    }

    private Long extractSeed(String text) {
        Matcher m = Pattern.compile("(seed|masterseed)\\s*(?:=|:)?\\s*(\\d+)").matcher(text);
        if (m.find()) {
            return Long.parseLong(m.group(2));
        }
        return 42L;
    }

    // --- Container Terminal Parameter Extraction ---
    private void extractTerminalParameters(String text, Map<String, Object> p, StringBuilder reasoning) {
        int baseBerths = 3;
        int baseCranes = 8;
        double baseGmph = 28.0;
        double baseArrivalRate = 4.0;
        String basePolicy = "DYNAMIC";

        if (text.contains("half the cranes") || text.contains("half of the cranes")) {
            baseCranes = 4;
            reasoning.append("Extracted 50% crane reduction -> 4 cranes. ");
        } else {
            Matcher downMatcher = Pattern.compile("(\\d+)\\s*(?:quay\\s*)?cranes?\\s*(?:go\\s*down|offline|broken|fail|lost|unavailable)").matcher(text);
            Matcher loseMatcher = Pattern.compile("(?:lose|down|offline|drop)\\s*(\\w+)?\\s*(\\d+)\\s*(?:quay\\s*)?cranes?").matcher(text);
            if (downMatcher.find()) {
                int down = Integer.parseInt(downMatcher.group(1));
                baseCranes = Math.max(1, 8 - down);
                reasoning.append("Detected ").append(down).append(" cranes offline -> ").append(baseCranes).append(" quay cranes. ");
            } else if (loseMatcher.find()) {
                int down = Integer.parseInt(loseMatcher.group(2));
                baseCranes = Math.max(1, 8 - down);
                reasoning.append("Detected loss of ").append(down).append(" cranes -> ").append(baseCranes).append(" quay cranes. ");
            } else if (text.contains("two cranes go down")) {
                baseCranes = 6;
                reasoning.append("Detected 2 cranes offline -> 6 quay cranes. ");
            } else if (text.contains("one crane goes down") || text.contains("1 crane broken")) {
                baseCranes = 7;
                reasoning.append("Detected 1 crane offline -> 7 quay cranes. ");
            } else {
                Matcher exactMatcher = Pattern.compile("(\\d+)\\s*(?:quay\\s*)?cranes?\\b").matcher(text);
                if (exactMatcher.find()) {
                    baseCranes = Integer.parseInt(exactMatcher.group(1));
                    reasoning.append("Set quay cranes to ").append(baseCranes).append(". ");
                }
            }
        }

        if (text.contains("berth 3 closed") || text.contains("one berth closed") || text.contains("lose 1 berth") || text.contains("lose a berth")) {
            baseBerths = 2;
            reasoning.append("Detected 1 berth closed -> 2 operational berths. ");
        } else {
            Matcher berthMatcher = Pattern.compile("(\\d+)\\s*berths?\\b").matcher(text);
            if (berthMatcher.find()) {
                baseBerths = Integer.parseInt(berthMatcher.group(1));
                reasoning.append("Set berths to ").append(baseBerths).append(". ");
            }
        }

        if (text.contains("static crane") || text.contains("static policy") || text.contains("static allocation") || text.contains("static")) {
            basePolicy = "STATIC";
            reasoning.append("Configured STATIC crane allocation policy (2 cranes/vessel). ");
        } else if (text.contains("dynamic crane") || text.contains("dynamic policy") || text.contains("dynamic allocation") || text.contains("dynamic")) {
            basePolicy = "DYNAMIC";
            reasoning.append("Configured DYNAMIC crane allocation policy (size-weighted). ");
        }

        if (text.contains("arrivals double") || text.contains("double vessel arrivals") || text.contains("vessels double") || text.contains("arrivals double")) {
            baseArrivalRate = 8.0;
            reasoning.append("Doubled vessel arrival rate to 8.0 vessels/day. ");
        } else {
            Matcher arrMatcher = Pattern.compile("(\\d+(\\.\\d+)?)\\s*(?:vessels?|ships?)\\s*(?:per\\s*day|/\\s*day|daily)").matcher(text);
            if (arrMatcher.find()) {
                baseArrivalRate = Double.parseDouble(arrMatcher.group(1));
                reasoning.append("Set vessel arrival rate to ").append(baseArrivalRate).append(" vessels/day. ");
            }
        }

        Matcher mphMatcher = Pattern.compile("(\\d+(\\.\\d+)?)\\s*(?:moves\\s*(?:per\\s*hour|/\\s*hr)|gmph)").matcher(text);
        if (mphMatcher.find()) {
            baseGmph = Double.parseDouble(mphMatcher.group(1));
            reasoning.append("Set crane speed to ").append(baseGmph).append(" GMPH. ");
        }

        p.put("berths", baseBerths);
        p.put("quayCranes", baseCranes);
        p.put("movesPerHourPerCrane", baseGmph);
        p.put("cranePolicy", basePolicy);
        p.put("arrivalRatePerDay", baseArrivalRate);
    }

    // --- Mobility Parameter Extraction ---
    private void extractMobilityParameters(String text, Map<String, Object> p, StringBuilder reasoning) {
        int baseFleet = 400;
        double baseMultiplier = 1.0;
        String basePolicy = "NEAREST";
        double baseBatchWindow = 20.0;
        double baseMaxWait = 600.0;

        // Percentage drops (e.g. "lose 20% of vehicles", "fleet drops 10%", "cut fleet by 30%")
        Matcher pctDrop = Pattern.compile("(?:(?:fleet|vehicles?|cars?|taxis?)\\s*(?:drops?|falls?|decreases?|cuts?|reduces?)\\s*(?:by\\s*)?(\\d+)%|(?:lose|cut|drop|reduce|down(?:\\s+by)?)\\s*(\\d+)%\\s*(?:of\\s*)?(?:the\\s*)?(?:vehicles?|fleet|cars?|taxis?)?)").matcher(text);
        if (pctDrop.find()) {
            String valStr = pctDrop.group(1) != null ? pctDrop.group(1) : pctDrop.group(2);
            int pct = Integer.parseInt(valStr);
            baseFleet = (int) Math.round(400 * (1.0 - (pct / 100.0)));
            reasoning.append("Applied ").append(pct).append("% vehicle fleet reduction -> ").append(baseFleet).append(" vehicles. ");
        } else if (text.contains("cut fleet in half") || text.contains("half the fleet") || text.contains("half of the vehicles")) {
            baseFleet = 200;
            reasoning.append("Cut fleet size by 50% -> 200 vehicles. ");
        } else {
            // Absolute count: "300 taxis", "500 vehicles", "200 vehicles", "fleet of 400"
            Matcher fleetMatcher = Pattern.compile("(?:(?:fleet\\s*(?:size|of)?\\s*|with\\s*|simulate\\s*)(\\d+)|(\\d+)\\s*(?:taxis?|vehicles?|cabs?|cars?))\\b").matcher(text);
            if (fleetMatcher.find() && !text.contains("per day")) {
                String num = fleetMatcher.group(1) != null ? fleetMatcher.group(1) : fleetMatcher.group(2);
                int val = Integer.parseInt(num);
                if (val >= 10 && val <= 5000) {
                    baseFleet = val;
                    reasoning.append("Explicit fleet size set to ").append(baseFleet).append(" vehicles. ");
                }
            }
        }

        // Demand surge / multiplier
        if (text.contains("demand triples") || text.contains("triple demand") || text.contains("3x demand")) {
            baseMultiplier = 3.0;
            reasoning.append("Tripled passenger demand (3.0x). ");
        } else if (text.contains("double demand") || text.contains("2x demand") || text.contains("demand doubles")) {
            baseMultiplier = 2.0;
            reasoning.append("Doubled passenger demand (2.0x). ");
        } else {
            Matcher surgePct = Pattern.compile("(?:surge|demand\\s*(?:up|increase|rise)?)\\s*(?:of\\s*|by\\s*)?(\\d+)%").matcher(text);
            Matcher multiplierMatcher = Pattern.compile("(\\d+(\\.\\d+)?)\\s*(?:x\\s*demand|times\\s*demand)").matcher(text);
            if (surgePct.find()) {
                int pct = Integer.parseInt(surgePct.group(1));
                baseMultiplier = 1.0 + (pct / 100.0);
                reasoning.append("Increased passenger demand by ").append(pct).append("% (multiplier ").append(baseMultiplier).append("). ");
            } else if (multiplierMatcher.find()) {
                baseMultiplier = Double.parseDouble(multiplierMatcher.group(1));
                reasoning.append("Set demand multiplier to ").append(baseMultiplier).append("x. ");
            } else if (text.contains("friday evening") || text.contains("rush hour")) {
                baseMultiplier = 1.3;
                reasoning.append("Detected rush hour / Friday evening context -> 1.3x baseline demand. ");
            }
        }

        // Policy detection (NEAREST, BATCHED, PREPOSITIONING)
        if (text.contains("prepositioning") || text.contains("preposition")) {
            basePolicy = "PREPOSITIONING";
            reasoning.append("Enabled PREPOSITIONING dispatch policy. ");
        } else if (text.contains("batch") || text.contains("batched")) {
            basePolicy = "BATCHED";
            reasoning.append("Enabled BATCHED dispatch policy. ");
            Matcher winMatcher = Pattern.compile("(?:batch\\s*window\\s*(?:of\\s*)?(\\d+(\\.\\d+)?)|(\\d+(\\.\\d+)?)\\s*(?:seconds?|secs?|s)?\\s*(?:batch\\s*window|batching))").matcher(text);
            if (winMatcher.find()) {
                String winStr = winMatcher.group(1) != null ? winMatcher.group(1) : winMatcher.group(3);
                baseBatchWindow = Double.parseDouble(winStr);
                reasoning.append("Set batch window to ").append(baseBatchWindow).append(" seconds. ");
            }
        } else if (text.contains("nearest") || text.contains("greedy")) {
            basePolicy = "NEAREST";
            reasoning.append("Enabled NEAREST dispatch policy. ");
        }

        Matcher waitMatcher = Pattern.compile("(?:cancel(?:lation)?|wait(?:ing)?\\s*tolerance)\\s*(?:after\\s*|of\\s*)?(\\d+)\\s*(minutes?|mins?|seconds?|secs?|s)").matcher(text);
        if (waitMatcher.find()) {
            double val = Double.parseDouble(waitMatcher.group(1));
            String unit = waitMatcher.group(2);
            baseMaxWait = unit.startsWith("m") ? val * 60.0 : val;
            reasoning.append("Set customer cancellation threshold to ").append(baseMaxWait).append(" seconds. ");
        }

        p.put("fleetSize", baseFleet);
        p.put("policy", basePolicy);
        p.put("demandMultiplier", baseMultiplier);
        p.put("batchWindowSeconds", baseBatchWindow);
        p.put("maxWaitTolerance", baseMaxWait);
    }

    // --- M/M/1 Queue Parameter Extraction ---
    private void extractMM1Parameters(String text, Map<String, Object> p, StringBuilder reasoning) {
        double baseLambda = 0.5;
        double baseMu = 1.0;
        int baseServers = 1;
        double baseWarmup = 2000.0;

        Matcher lambdaMatcher = Pattern.compile("(?:lambda|arrival\\s*rate)\\s*(?:=|of|is|:)?\\s*(\\d+(\\.\\d+)?)").matcher(text);
        if (lambdaMatcher.find()) {
            baseLambda = Double.parseDouble(lambdaMatcher.group(1));
            reasoning.append("Extracted arrival rate lambda = ").append(baseLambda).append(". ");
        }

        Matcher muMatcher = Pattern.compile("(?:mu|service\\s*rate)\\s*(?:=|of|is|:)?\\s*(\\d+(\\.\\d+)?)").matcher(text);
        if (muMatcher.find()) {
            baseMu = Double.parseDouble(muMatcher.group(1));
            reasoning.append("Extracted service rate mu = ").append(baseMu).append(". ");
        }

        if (text.contains("single server") || text.contains("single-server")) {
            baseServers = 1;
        } else if (text.contains("dual server") || text.contains("two servers")) {
            baseServers = 2;
            reasoning.append("Extracted 2 servers (c=2). ");
        } else {
            Matcher serverMatcher = Pattern.compile("(?:servers?|c)\\s*(?:=|of|:)?\\s*(\\d+)|(\\d+)\\s*servers?").matcher(text);
            if (serverMatcher.find()) {
                String num = serverMatcher.group(1) != null ? serverMatcher.group(1) : serverMatcher.group(2);
                baseServers = Integer.parseInt(num);
                reasoning.append("Extracted ").append(baseServers).append(" servers. ");
            }
        }

        Matcher warmupMatcher = Pattern.compile("warmup\\s*(?:=|of|:)?\\s*(\\d+(\\.\\d+)?)").matcher(text);
        if (warmupMatcher.find()) {
            baseWarmup = Double.parseDouble(warmupMatcher.group(1));
            reasoning.append("Extracted warmup period = ").append(baseWarmup).append("s. ");
        }

        p.put("lambda", baseLambda);
        p.put("mu", baseMu);
        p.put("warmup", baseWarmup);
        p.put("servers", baseServers);
    }

    private String summarizeTerminal(Map<String, Object> p) {
        return p.get("quayCranes") + " cranes, " + p.get("berths") + " berths (" + p.get("cranePolicy") + ")";
    }

    private String summarizeMobility(Map<String, Object> p) {
        return p.get("fleetSize") + " vehicles (" + p.get("policy") + ", " + p.get("demandMultiplier") + "x demand)";
    }
}
