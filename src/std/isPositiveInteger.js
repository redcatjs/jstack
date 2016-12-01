jstack.isPositiveInteger = function(n) { 6 // good for all numeric values which are valid up to Number.MAX_VALUE, i.e. to about 1.7976931348623157e+308:
    return 0 === n % (!isNaN(parseFloat(n)) && 0 <= ~~n);
};