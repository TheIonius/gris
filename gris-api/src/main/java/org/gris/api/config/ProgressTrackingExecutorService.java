package org.gris.api.config;

import java.util.Collection;
import java.util.List;
import java.util.concurrent.*;
import java.util.function.Consumer;

/**
 * Delegating ExecutorService that captures active scenario execution context
 * and notifies listeners as individual Monte Carlo replications finish.
 */
public class ProgressTrackingExecutorService implements ExecutorService {

    public static final ThreadLocal<String> CURRENT_SCENARIO_ID = new ThreadLocal<>();
    private static final List<Consumer<String>> LISTENERS = new CopyOnWriteArrayList<>();

    private final ExecutorService delegate;

    public ProgressTrackingExecutorService(ExecutorService delegate) {
        this.delegate = delegate;
    }

    public static void registerListener(Consumer<String> listener) {
        LISTENERS.add(listener);
    }

    public static void unregisterListener(Consumer<String> listener) {
        LISTENERS.remove(listener);
    }

    @Override
    public void execute(Runnable command) {
        String scenarioId = CURRENT_SCENARIO_ID.get();
        if (scenarioId == null) {
            delegate.execute(command);
        } else {
            delegate.execute(() -> {
                try {
                    command.run();
                } finally {
                    for (Consumer<String> listener : LISTENERS) {
                        try {
                            listener.accept(scenarioId);
                        } catch (Exception ignored) {
                        }
                    }
                }
            });
        }
    }

    @Override
    public void shutdown() {
        delegate.shutdown();
    }

    @Override
    public List<Runnable> shutdownNow() {
        return delegate.shutdownNow();
    }

    @Override
    public boolean isShutdown() {
        return delegate.isShutdown();
    }

    @Override
    public boolean isTerminated() {
        return delegate.isTerminated();
    }

    @Override
    public boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException {
        return delegate.awaitTermination(timeout, unit);
    }

    @Override
    public <T> Future<T> submit(Callable<T> task) {
        return delegate.submit(task);
    }

    @Override
    public <T> Future<T> submit(Runnable task, T result) {
        return delegate.submit(task, result);
    }

    @Override
    public Future<?> submit(Runnable task) {
        return delegate.submit(task);
    }

    @Override
    public <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks) throws InterruptedException {
        return delegate.invokeAll(tasks);
    }

    @Override
    public <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks, long timeout, TimeUnit unit) throws InterruptedException {
        return delegate.invokeAll(tasks, timeout, unit);
    }

    @Override
    public <T> T invokeAny(Collection<? extends Callable<T>> tasks) throws InterruptedException, ExecutionException {
        return delegate.invokeAny(tasks);
    }

    @Override
    public <T> T invokeAny(Collection<? extends Callable<T>> tasks, long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException {
        return delegate.invokeAny(tasks, timeout, unit);
    }
}
