/**
 * A simple Logger class that enhances standard console methods
 * by adding a timestamp to each log entry.
 *
 * It provides methods for logging messages, warnings, errors, and traces.
 */
class Logger {
    /**
     * Private static method to format a Date object into a detailed
     * local date and time string: YYYY-MM-DD HH:mm:ss.sss
     * @param {Date} date The Date object to format.
     * @returns {string} The formatted date and time string.
     */
    static #formatLocalDateTime(date) {
        const pad = (num) => String(num).padStart(2, "0");
        const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

        return (
            `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
                date.getDate()
            )} ` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
                date.getSeconds()
            )}.${milliseconds}`
        );
    }

    /**
     * Logs a message to the console with a timestamp.
     * @param {...any} args The arguments to log.
     */
    log(...args) {
        console.log(`[${Logger.#formatLocalDateTime(new Date())}]`, ...args);
    }

    /**
     * Logs a warning message to the console with a timestamp.
     * @param {...any} args The arguments to warn.
     */
    warn(...args) {
        console.warn(`[${Logger.#formatLocalDateTime(new Date())}]`, ...args);
    }

    /**
     * Logs an error message to the console with a timestamp.
     * @param {...any} args The arguments to error.
     */
    error(...args) {
        console.error(`[${Logger.#formatLocalDateTime(new Date())}]`, ...args);
    }

    /**
     * Logs a message and a stack trace to the console with a timestamp.
     * @param {...any} args The arguments to trace.
     */
    trace(...args) {
        console.trace(`[${Logger.#formatLocalDateTime(new Date())}]`, ...args);
    }
}
