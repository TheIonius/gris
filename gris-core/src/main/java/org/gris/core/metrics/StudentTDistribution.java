package org.gris.core.metrics;

/**
 * Calculates Student-t distribution critical values for statistical confidence intervals.
 * Provides exact lookup for degrees of freedom 1 to 120 and asymptotic expansion for df > 120.
 */
public final class StudentTDistribution {

    // Critical values t_{alpha/2, df} for alpha = 0.05 (two-tailed 95% confidence interval)
    // Index corresponds directly to degrees of freedom (1-based index)
    private static final double[] T_CRIT_95_TABLE = {
            Double.NaN, // index 0 unused
            12.706,  4.303,  3.182,  2.776,  2.571,  2.447,  2.365,  2.306,  2.262,  2.228, // 1-10
            2.201,   2.179,  2.160,  2.145,  2.131,  2.120,  2.110,  2.101,  2.093,  2.086, // 11-20
            2.080,   2.074,  2.069,  2.064,  2.060,  2.056,  2.052,  2.048,  2.045,  2.042, // 21-30
            2.040,   2.037,  2.035,  2.032,  2.030,  2.028,  2.026,  2.024,  2.023,  2.021, // 31-40
            2.020,   2.018,  2.017,  2.015,  2.014,  2.013,  2.012,  2.011,  2.010,  2.009, // 41-50
            2.008,   2.007,  2.006,  2.005,  2.004,  2.003,  2.002,  2.002,  2.001,  2.000, // 51-60
            2.000,   1.999,  1.998,  1.998,  1.997,  1.997,  1.996,  1.995,  1.995,  1.994, // 61-70
            1.994,   1.993,  1.993,  1.993,  1.992,  1.992,  1.991,  1.991,  1.990,  1.990, // 71-80
            1.990,   1.989,  1.989,  1.989,  1.988,  1.988,  1.988,  1.987,  1.987,  1.987, // 81-90
            1.986,   1.986,  1.986,  1.985,  1.985,  1.985,  1.984,  1.984,  1.984,  1.984, // 91-100
            1.984,   1.983,  1.983,  1.983,  1.983,  1.982,  1.982,  1.982,  1.982,  1.982, // 101-110
            1.981,   1.981,  1.981,  1.981,  1.981,  1.980,  1.980,  1.980,  1.980,  1.980  // 111-120
    };

    private static final double Z_95 = 1.959963984540054; // Standard normal critical value for alpha=0.05

    private StudentTDistribution() {
    }

    /**
     * Returns the two-tailed critical value for a 95% confidence interval given degrees of freedom.
     *
     * @param df degrees of freedom (must be >= 1)
     * @return t_{0.025, df}
     */
    public static double getCriticalValue95(int df) {
        if (df < 1) {
            throw new IllegalArgumentException("Degrees of freedom must be >= 1, got: " + df);
        }
        if (df < T_CRIT_95_TABLE.length) {
            return T_CRIT_95_TABLE[df];
        }

        // Cornish-Fisher expansion for large df
        double z = Z_95;
        double z3 = z * z * z;
        double z5 = z3 * z * z;
        double invDf = 1.0 / df;
        double invDf2 = invDf * invDf;

        return z + (z3 + z) * (invDf / 4.0) + (5.0 * z5 + 16.0 * z3 + 3.0 * z) * (invDf2 / 96.0);
    }
}
