var ADSKSpark = ADSKSpark || {};

(function () {
	'use strict';

	var Client = ADSKSpark.Client;

	/**
	 * @class
	 * @type {{retrieveMemberDetails: Function, getMyProfile: Function}}
	 * @description The Members API singleton.
	 * See reference - https://spark.autodesk.com/developers/reference/drive?deeplink=%2Freference%2Fmembers
	 */
	ADSKSpark.Members = {

		/**
		 * Gets member profile by memberId
		 * @returns {Promise} - A promise that will resolve to a member object
		 */
		getMemberProfile: function (memberId) {

			//Make sure memberId is defined and that it is a number
			if (!isNaN(memberId)) {
				return Client.authorizedApiRequest('/members/' + memberId).get();
			}
			return Promise.reject(new Error('Proper memberId was not supplied'));
		},


		/**
		 * Gets logged in member profile
		 * @returns {Promise} - A promise that will resolve to current logged in member object
		 */
		getMyProfile: function () {
			return Client.authorizedApiRequest('/members').get();

		}

	};
}());