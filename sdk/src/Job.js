var ADSKSpark = ADSKSpark || {};

(function () {
    var Client = ADSKSpark.Client;

    /**
     * A paginated array of jobs.
     * @param {Object} data - JSON data.
     * @constructor
     */
    ADSKSpark.Jobs = function (data) {
        ADSKSpark.Paginated.call(this, data);
    };

    ADSKSpark.Jobs.prototype = Object.create(ADSKSpark.Paginated.prototype);
    ADSKSpark.Jobs.prototype.constructor = ADSKSpark.Jobs;

    /**
     * Get jobs registered to a member.
     * @param {Object} [headers] - Optional list of request header properties.
     * @param {Object} [params] - limit/offset/sort/filter options.
     * @returns {Promise} - A promise that will resolve to an array of jobs.
     */
    ADSKSpark.Jobs.get = function (headers, params) {
        return Client.authorizedApiRequest('/print/jobs')
            .get(headers, params)
            .then(function (data) {
                return new ADSKSpark.Jobs(data);
            });
    };

    /**
     * Get jobs registered to a printer.
     * @param {String} string - Spark Printer Id.
     * @param {Object} [headers] - Optional list of request header properties.
     * @param {Object} [params] - limit/offset/sort/filter options.
     * @returns {Promise} - A promise that will resolve to an array of jobs.
     */
    ADSKSpark.Jobs.getPrinter = function (printerId, headers, params) {
        return Client.authorizedApiRequest('/print/printers/' + printerId.toString() + '/jobs')
            .get(headers, params)
            .then(function (data) {
                return new ADSKSpark.Jobs(data);
            });
    };

    ADSKSpark.Jobs.prototype.parse = function (data) {
        ADSKSpark.Paginated.prototype.parse.call(this, data);
        if (data) {
            var jobs = data.jobs || data.printer_jobs;
            if (Array.isArray(jobs)) {
                var _this = this;
                jobs.forEach(function (job) {
                    if (!job.printer_id) {
                        job.printer_id = data.printer_id;
                    }
                    if (!job.member_id) {
                        job.member_id = data.member_id;
                    }
                    _this.push(new ADSKSpark.Job(job));
                });
            }
        }
    };

    /**
     * A print job.
     * @param {Object} [data] - JSON data returned from Job status or list query. If omitted an empty Job object is constructed which can subsequently be used to invoke the "create" method.
     * @constructor
     */
    ADSKSpark.Job = function (data) {
        this.status = null;
        this.progress = 0.0;

        if( data ) {
            this.id = data.job_id;
            this.printer_id = data.printer_id;
            this.status   = data.job_status ? data.job_status.job_status : null;
            this.progress = data.job_status ? data.job_status.job_progress : 0.0;
            this.data = data;   // TODO: Just copy all properties over to this?
        }
    };

    ADSKSpark.Job.prototype = {

        constructor: ADSKSpark.Job,

        /**
         * Get the status of a print job.
         * @returns {Promise} - A Promise that will resolve to this object with updated status information.
         */
        getStatus: function () {
            if( !this.id )
                return Promise.reject(new Error("Job does not exist."));

            var _this = this;
            return Client.authorizedApiRequest('/print/jobs/' + this.id)
                .get()
                .then(function (data) {
                    _this.status   = data.job_status ? data.job_status.job_status : null;
                    _this.progress = data.job_status ? data.job_status.job_progress : 0.0;
                    _this.data = data;  // TODO: Just copy all properties over to this?
                    return _this;
                })
                .catch(function (error) {
                    _this.status = null;
                    throw error;            // Propagate error.
                });
        },


        /**
         * Create a new print job. Note, this may also send it immediately to the printer.
         * @param {string} printerId - Spark Id of the target printer.
         * @param {string} profileId - Spark Printer Profile Id to be used for this print job.
         * @param {string} printableId - Spark Drive Id of the printable file.
         * @returns {Promise} - A Promise which resolves to this object with updated contents.
         * @see {@link ADSKSpark.TrayAPI.generatePrintable}
         */
        create: function(printerId, profileId, printableId) {
            if( this.id )
                return Promise.reject(new Error("Job already exists."));

            var _this = this;
            function updateJob(data) {
                _this.id = data.job_id;
                return _this.getStatus();
            }
            var headers = {'Content-Type': 'application/json'};
            var payload = JSON.stringify({
                'printer_id': printerId,
                'settings': { 'profile_id': profileId},
                'printable_id': printableId
            });
            this.printer_id = printerId;        // Not currently available from server query
            this.profile_id = profileId;        // Not currently available from server query
            this.printable_id = printableId;    // Not currently available from server query
            return Client.authorizedApiRequest('/print/printers/' + printerId + '/jobs')
                    .post(headers, payload)
                    .then(updateJob);
        },

        /**
         * Update the job status and comment with optional custom data for this job.
         * @param {string} newStatus - job status string. Must be either "success" or "failed".
         * @param {string} newComment - comment string 
         * @param {object} [customData] - custom application data to be saved with this job.
         * @returns {Promise} - A Promise which resolves to this object with updated contents.
         */
        updateStatus: function(newStatus, newComment, customData) {
            if( !this.id )
                return Promise.reject(new Error("Unknown job in updateStatus."));

            newStatus = newStatus.toLowerCase();
            if( newStatus !== "success" && newStatus !== "failed" )
                return Promise.reject(new Error("Invalid job status in updateStatus."));

            var _this = this;
            var urlStatus  = encodeURIComponent(newStatus);
            var urlComment = encodeURIComponent(newComment);
            var headers, payload;
            if( customData ) {
                headers = {'Content-Type': 'application/json'};
                payload = JSON.stringify(customData);
            }
            return Client.authorizedApiRequest('/print/jobs/' + this.id + '?status=' + urlStatus + '&comment=' + urlComment)
                    .put(headers, payload)
                    .then(function(response) {
                        console.log("GOT: " + JSON.stringify(response));
                        return _this.getStatus();
                    });
        },

        /**
         * Set a callback for a print job.
         * @param {string} callbackUrl
         * @returns {Promise}
         */
        setCallback: function (callbackUrl) {
            return Client.authorizedApiRequest('/print/jobs/' + this.id + '/register')
                .post(null, {callback_url: callbackUrl});
        }
    };

})();
