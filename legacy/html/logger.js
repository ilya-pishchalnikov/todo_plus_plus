//Enhance the standard console output by adding a datetime stamp
const logger = {
    log: (...args) => console.log(`[${formatLocalDateTime(new Date())}] `, ...args),
    warn: (...args) => console.warn(`[${formatLocalDateTime(new Date())}] `, ...args),
    error: (...args) => console.error(`[${formatLocalDateTime(new Date())}] `, ...args),
    trace: (...args) => {
        console.log(`[${formatLocalDateTime(new Date())}] `);
        console.trace();
      }
  };

  function formatLocalDateTime(date) {
    const pad = num => num.toString().padStart(2, '0');
    
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds())}`;
  }