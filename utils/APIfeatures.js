
class APIFeatures {
    constructor(query, queryObj) {
        this.query = query;
        this.queryObj = queryObj;
    }
    filter() {
        // Filtering 
        const myQuery = { ...this.queryObj };
        const excuded = ["sort", "limit", "page", "fields"];
        excuded.forEach(ele => delete myQuery[ele]);


        // Advanced filtering
        let queryStringified = JSON.stringify(myQuery);
        queryStringified = queryStringified.replace(/\b(lte|lt|gte|gt|ne)\b/g, (match) => `$${match}`);
        const filtredQuery = JSON.parse(queryStringified);
        this.query = this.query.find(filtredQuery)
        return this;
    }
    sort() {
        if (this.queryObj.sort) {
            const sortString = this.queryObj.sort.split(",").join(" ");
            this.query = this.query.sort(sortString)
        } else {
            this.query = this.query.sort("-createdAt")
        }
        return this;
    }
    limitFields() {
        if (this.queryObj.fields) {
            const fields = this.queryObj.fields.split(",").join(" ")
            this.query = this.query.select(fields)
        }
        return this;
    }
    paginate() {

        const limit = this.queryObj.limit * 1 || 10;
        const page = this.queryObj.page * 1 || 1;
        const skip = limit * (page - 1);
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}


module.exports = APIFeatures;