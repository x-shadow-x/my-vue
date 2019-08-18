function typeOf(arg, type) {
    if(type) {
        const result = Object.prototype.toString.call(arg);
        return result.toUpperCase() === `[object ${type}]`.toUpperCase();
    }
    return false;
}

export { typeOf };