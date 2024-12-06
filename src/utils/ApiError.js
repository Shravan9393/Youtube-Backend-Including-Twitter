class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        statck = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null;
        // read what is this.data field , read it's documenatation
        this.message = message
        this.success = false;
        this.errors = errors

        if(stack){
            this.stack = statck
        }else{
            Error.captureStackTrace(this, this.constructor)
        }


    }
}


export {ApiError}