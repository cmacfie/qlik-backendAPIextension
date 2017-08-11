/*
 * Basic responsive mashup template
 * @owner Enter you name here (xxx)
 */
/*
 *    Fill in host and port for Qlik engine
 */
var prefix = window.location.pathname.substr( 0, window.location.pathname.toLowerCase().lastIndexOf( "/extensions" ) + 1 );
var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
require.config( {
	baseUrl: ( config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources"
} );

require( ["js/qlik"], function ( qlik ) {
	qlik.setOnError( function ( error ) {
		$( '#popupText' ).append( error.message + "<br>" );
		$( '#popup' ).fadeIn( 1000 );
	} );
	$( "#closePopup" ).click( function () {
		$( '#popup' ).hide();
	} );


	//open apps -- inserted here --

	var app = qlik.openApp('Helpdesk Management.qvf', config);
	var app1 = qlik.openApp('Helpdesk_Management.qvf', config);


	//get objects -- inserted here --
	app1.getObject('QV01','VZpUGK');
	
	
	
	
	
	

	console.log("app", app);


    //callbacks -- inserted here --
	function StackMyPitchUp(reply, app){}

    function PriorityCall(reply, app){}


    //create cubes and lists -- inserted here --
    app.createCube({
        "qInitialDataFetch": [
            {
                "qHeight": 20,
                "qWidth": 1
            }
        ],
        "qDimensions": [
            {
                "qLabel": "Year",
                "qLibraryId": "jySjA",
                "qNullSuppression": true,
                "qOtherTotalSpec": {
                    "qOtherMode": "OTHER_OFF",
                    "qSuppressOther": true,
                    "qOtherSortMode": "OTHER_SORT_DESCENDING",
                    "qOtherCounted": {
                        "qv": "5"
                    },
                    "qOtherLimitMode": "OTHER_GE_LIMIT"
                }
            }
        ],
        "qMeasures": [],
        "qSuppressZero": true,
        "qSuppressMissing": true,
        "qMode": "P",
        "qInterColumnSortOrder": [],
        "qStateName": "$"
    },PriorityCall);
	app.createCube({
	"qInitialDataFetch": [
		{
			"qHeight": 20,
			"qWidth": 2
		}
	],
	"qDimensions": [
		{
			"qLabel": "IT Resources",
			"qLibraryId": "rfQk",
			"qNullSuppression": true,
			"qOtherTotalSpec": {
				"qOtherMode": "OTHER_OFF",
				"qSuppressOther": true,
				"qOtherSortMode": "OTHER_SORT_DESCENDING",
				"qOtherCounted": {
					"qv": "5"
				},
				"qOtherLimitMode": "OTHER_GE_LIMIT"
			}
		}
	],
	"qMeasures": [
		{
			"qLabel": "Open Cases",
			"qLibraryId": "MPcQeZ",
			"qSortBy": {
				"qSortByState": 0,
				"qSortByFrequency": 0,
				"qSortByNumeric": 0,
				"qSortByAscii": 1,
				"qSortByLoadOrder": 0,
				"qSortByExpression": 0,
				"qExpression": {
					"qv": " "
				}
			}
		}
	],
	"qSuppressZero": false,
	"qSuppressMissing": false,
	"qMode": "K",
	"qInterColumnSortOrder": [],
	"qStateName": "$"
	},StackMyPitchUp);
} );