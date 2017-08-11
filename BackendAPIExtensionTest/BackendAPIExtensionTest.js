define(["qlik", "jquery", "text!./style.css", "text!./template.html"], function (qlik, $, cssContent, template) {
    'use strict';
    $("<style>").html(cssContent).appendTo("head");


        var testCount = 0, okCount = 0, tests = {};
        var promisesArray = [];
        var promisesArray_recallers = [];

        var Gelement, resultElement, tbodyElement;

        var setProperty_testInProgress = false;
        var setProperty_done = false;
        var setProperty_stage = 1;


        var runNormalTestsStarted = false;

        var currAppWithThis, currApp;

        function okTest(id, description, t) {
           if (tests[id]) {
               return;
           }
           tests[id] = true;
           okCount++;
           Gelement.find("tr.queue_" + id + " .queue_result").html("OK");
           // $( "#" + id + "_result_root_api" ).html( "OK" );
           Gelement.find("tr.queue_" + id + " .queue_benchmark").html(t + " ms");
           // $( "#" + id + "_time_root_api" ).html( t + " ms" );
           if (okCount === testCount) {
               resultElement.html("All OK");
           } else {
               resultElement.html(okCount + " of " + testCount);
           }
           console.log(description + " -- finished");
       }

       function failTest(id, description, t, error) {
           if (tests[id]) {
               return;
           }
           tests[id] = false;
           Gelement.find("tr.queue_" + id + " .queue_result").html("FAIL: " + error);
           // $( "#" + id + "_result" ).html( "FAIL: " + error );
           Gelement.find("tr.queue_" + id + " .queue_benchmark").html(t + " ms");
           // $( "#" + id + "_time" ).html( t + " ms" );
           if (okCount === testCount) {
               resultElement.html("All OK");
           } else {
               resultElement.html(okCount + " of " + testCount);
           }
           console.log(description + " -- failed");
       }

       function queueTest(description, promise, isRecaller) {
           /** Only add it if a test with the description doesn't already exist */
           if (document.documentElement.innerHTML.indexOf(description) === -1) {
               var id = ++testCount;
               var html = '<td>' + id + '</td><td>' + description + '</td><td class="queue_result"></td><td class="queue_benchmark"></td>';
               console.log("test: " + description + " is queued");
               tbodyElement.append('<tr class="queue_' + id + '"></tr>');
               tbodyElement.find("tr:last").append(html);
               if (isRecaller) {
                   promisesArray_recallers.push(promise.bind({id: id, desc: description}));
               } else {
                   promisesArray.push(promise.bind({id: id, desc: description}));
               }
           }
       }


       function benchmark() {
           var start = new Date();
           return {
               finish: function () {
                   return ( new Date()).getTime() - start.getTime();
               }
           }
       }

       function runNormalTests() {
           var currentMode = qlik.navigation.getMode();
           console.log("start running Root API tests");
           return sequence(qlik.Promise, promisesArray).then(function () {
               console.log("--finished-- running Root API tests");
               //restore mode
               qlik.navigation.setMode(currentMode);
           });
       }

       function runRecallTests() {
           var currentMode = qlik.navigation.getMode();
           return sequence(qlik.Promise, promisesArray_recallers).then(function () {
               //restore mode
               qlik.navigation.setMode(currentMode);
           });
       }

       function sequence(Promise, promiseArr) {
           return promiseArr.reduce(function (current, next) {
               return current.then(next);
           }, Promise.resolve());
       }


    function setUpRecallTests(mainScope, layout){
        /** By Christoffer MacFie, August 2017*/
        /** Advanced test because setProperty recalls paint. What code to execute kept track of via flags.
         * 1. Verify that title and the change the title
         * 2. Verify the change and then change it back for next round */
        if(!setProperty_done) {
            queueTest("setProperty", function () {
                //TODO REmove this
                var t = benchmark();
                var me = this;
                var dfd = qlik.Promise.defer();
                mainScope.backendApi.getProperties().then(function (props) {
                    if (props.props.testtitle === "testingtitle" && !setProperty_testInProgress) {
                        setProperty_stage = 2;
                        setProperty_testInProgress = true;
                        props.props.testtitle = "testingtitle2";
                        mainScope.backendApi.setProperties(props);
                    } else if (props.props.testtitle === "testingtitle2" && setProperty_testInProgress) {
                        setProperty_stage = 3;
                        props.props.testtitle = "testingtitle";
                        setProperty_done = true;
                        mainScope.backendApi.setProperties(props);
                    } else if (props.props.testtitle === "testingtitle" && setProperty_testInProgress) {
                        setProperty_testInProgress = false;
                        okTest(me.id, me.desc, t.finish());
                        dfd.resolve();
                    } else {
                        //Clean up, reset the testtitle
                        props.props.testtitle = "testingtitle";
                        mainScope.backendApi.setProperties(props);

                        var failMessage = "";
                        switch (setProperty_stage) {
                            case 1 :
                                failMessage = "Expected title === 'testingtitle, was " + props.props.testtitle;
                                break;
                            case 2 :
                                failMessage = "Expected title === 'testingtitle2, was " + props.props.testtitle;
                                break;
                            case 3 :
                                failMessage = "Expected title === 'testingtitle, was " + props.props.testtitle;
                                break;
                            default :
                                failMessage = "testtitle was " + props.props.testtitle;
                                break;
                        }
                        setProperty_done = true;
                        failTest(me.id, me.desc, t.finish(), failMessage);
                        dfd.resolve();
                    }
                });
                return dfd.promise;
            }, true);
        }
    }

    function setUpNormalTests(mainScope, layout) {

        /** By Christoffer MacFie, August 2017*/
        queueTest("getProperty", function () {
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();
            mainScope.backendApi.getProperties().then(function (propsBefore) {
                if (propsBefore.props.testtitle === "testingtitle") {
                    okTest(me.id, me.desc, t.finish());
                    dfd.resolve();
                } else {
                    failTest(me.id, me.desc, t.finish(), "Expected title === 'testingtitle', was " + propsBefore.props.title);
                    dfd.resolve();
                }
            });
            return dfd.promise;
        }, false);

        /** By Christoffer MacFie, August 2017*/
        queueTest("getMeasureInfos", function () {
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();

            var layout_title = layout.qHyperCube.qMeasureInfo[0].qFallbackTitle;
            var backendApi_title = mainScope.backendApi.getMeasureInfos()[0].qFallbackTitle;
            if(layout_title === backendApi_title){
                okTest(me.id, me.desc, t.finish());
                dfd.resolve();
            } else {
                failTest(me.id, me.desc, t.finish(), "Expected measuretitle to be " + layout_title + ", was " + backendApi_title);
                dfd.resolve();
            }
            return dfd.promise;
        });

        //TODO Doesn't make correct selection
        // queueTest("Select Range", function () {
        //     var t = benchmark();
        //     var me = this;
        //     var dfd = qlik.Promise.defer();
        //     var range = {
        //         "qMeasureIx": 0,
        //         "qRange": {
        //             "qMin": 0,
        //             "qMax": 1,
        //         }
        //     };
        //
        //     mainScope.backendApi.selectRange([range], false).then(function () {
        //         okTest(me.id, me.desc, t.finish());
        //         dfd.resolve();
        //     });
        //     console.log("layout",layout);
        //     return dfd.promise;
        // }, true);

        /** By Christoffer MacFie, August 2017*/
        queueTest("getRowCount", function () {
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();
            let getRowCount = mainScope.backendApi.getRowCount();
            let layoutSize = layout.qHyperCube.qSize.qcy;
            if (getRowCount === layoutSize) {
                okTest(me.id, me.desc, t.finish());
                dfd.resolve();
            } else {
                failTest(me.id, me.desc, t.finish(), "getRowCount was " + getRowCount + ", expected " + layoutSize);
                dfd.resolve();
            }
            return dfd.promise;
        }, false);

        /** By Christoffer MacFie, August 2017*/
        queueTest("getData", function () {
            console.log("Data started");
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();
            let dataAtStart = layout.qHyperCube.qDataPages[0].qMatrix.length;
            if (dataAtStart === 5) {
                let lastrow = layout.qHyperCube.qDataPages[0].qMatrix.length - 1;
                if (mainScope.backendApi.getRowCount() >= lastrow + 1) {
                    var requestPage = [{
                        qTop: lastrow + 1,
                        qLeft: 0,
                        qWidth: 4,
                        qHeight: 2
                    }];
                    //Get mroe data
                    mainScope.backendApi.getData(requestPage).then(function (promise) {
                        //Sum the length of all pages
                        var totalLength = 0;
                        layout.qHyperCube.qDataPages.forEach(function (page) {
                            totalLength += page.qMatrix.length;
                        });
                        //Verify that the new total length is 7
                        if (totalLength === 7) {
                            okTest(me.id, me.desc, t.finish())
                            dfd.resolve();
                        } else {
                            failTest(me.id, me.desc, t.finish(), "Fetched dataafter getData method === " + totalLength + ", expected 7");
                            dfd.resolve();
                        }
                    });
                } else {
                    failTest(me.id, me.desc, t.finish(), "Already fetched all available data");
                    dfd.resolve();
                }
            } else {
                failTest(me.id, me.desc, t.finish(), "Fetched data at start === " + dataAtStart + ", expected 5");
                dfd.resolve();
            }
            return dfd.promise;
        }, false);

        /** By George Tzanavaras, August 2017*/
        queueTest(" getDimensionInfo ",function (){
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();
            var dimensionInfo = layout.qHyperCube.qDimensionInfo;
            var backendApiDimensionInfo = mainScope.backendApi.getDimensionInfos();

            for ( let i=0; i< backendApiDimensionInfo.length; i++) {
                if( backendApiDimensionInfo[i].qFallbackTitle === dimensionInfo[i].qFallbackTitle && backendApiDimensionInfo[i].cId === dimensionInfo[i].cId ) {
                    okTest( me.id, me.desc, t.finish() );
                    dfd.resolve();
                } else {
                    failTest(me.id, me.desc, t.finish(), "getDimensionInfo was"+ dimensionInfo +", expected " +  backendApiDimensionInfo);
                    dfd.resolve();
                    break;
                }
            }
            dfd.resolve();
            return dfd.promise;
        }, false);


        /** By George Tzanavaras, August 2017*/
         queueTest(" getDataRow ",function () {
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();
            var dataPages=layout.qHyperCube.qDataPages[0].qMatrix;
            // console.log(dataPages);
            // var backendApiGetDataRow=backendApi.getDataRow(6);

            dataPages.forEach( function ( value, key ) {

                let qMatrixBackendApi=mainScope.backendApi.getDataRow(key);

                if( value[0].qText === qMatrixBackendApi[0].qText && value[0].qElemNumber === qMatrixBackendApi[0].qElemNumber )//comaparing array of objects of elements -qText, qNum, qElemNumber , qState//
                {
                  okTest( me.id, me.desc, t.finish() );
                } else {
                    if(value[0].qText !== qMatrixBackendApi[0].qText) {
                        failTest(me.id, me.desc, t.finish(), "getDataRow qText is "+ value[0].qText +", expected " +  qMatrixBackendApi[0].qText);
                    } else {
                        failTest(me.id, me.desc, t.finish(), "getDataRow qElemNumber is "+ value[0].qElemNumber +", expected " +  qMatrixBackendApi[0].qElemNumber);
                    }
                }
            } );
              dfd.resolve();
            return dfd.promise;

        } , false);

         /** By George Tzanavaras, August 2017*/
        queueTest(" eachDataRow ",function () {
                var t = benchmark();
                var me = this;
                var dfd = qlik.Promise.defer();
                var dataPages=layout.qHyperCube.qDataPages;
                var holdTheRow=[];
                dataPages.forEach(function(row, key) {
                    row.qMatrix.forEach( function (cell, key){
                        holdTheRow.push(cell);
                    });
                });


                mainScope.backendApi.eachDataRow( function ( rownum, row ) {

                    let hodow = holdTheRow[rownum][0]; // holds the object array of the holdTheRow variable
                    if( row[0].qText === hodow.qText && row[0].qElemNumber === hodow.qElemNumber ) {
                         okTest( me.id, me.desc, t.finish() );
                    } else {
                        if(row[0].qText !== hodow.qText) {
                         failTest(me.id, me.desc, t.finish(), "getDataRow qText is "+ row[0].qText +", expected " +  hodow.qText);
                        } else {
                            failTest(me.id, me.desc, t.finish(), "getDataRow qElemNumber is "+ row[0].qElemNumber +", expected " +  hodow.qElemNumber);
                        }
                    }
                } );
                dfd.resolve();
                return dfd.promise;
           }, false);


         // queueTest(" selectRange ",function () {
             // var t = benchmark();
             // var me = this;
             // var dfd = qlik.Promise.defer();
             // var dataPages=layout.qHyperCube;
             // let selectionState=currApp.selectionState();
             // console.log(selectionState);
             //
             // var listener= function() {
             //     var range = {
             //         "qMeasureIx": 0,
             //         "qRange": {
             //             "qMin": 0,
             //             "qMax": 1,
             //             "qMinInclEq": true
             //         }
             //     };
             //     backendApi.selectRange( [range],true ).then(function(promice){
             //
             //
             //         if(selectionState.selections.length > 0) {
             //             okTest(me.id , me.desc , t.finish());
             //         }
             //         else {
             //             failTest( me.id , me.desc , t.finish() , " Select Range was not possible to be applied ");
             //         }
             //         selectionState.OnData.unbind( listener );
             //         selectionState.clearAll();
             //         dfd.resolve();
             //     });
             // };
             //
             // selectionState.OnData.bind( listener );
             //
             // return dfd.promise;
         // });

        /** By George Tzanavaras, August 2017*/
        queueTest(" getReducedData ",function () {
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();
            var dataPages = layout.qHyperCube.qDataPages;
           var requestPage = [{
               qTop: 0,
               qLeft: 0,
               qWidth: 2,
               qHeight:5
           }];
           var topLength = requestPage[0].qHeight;

           mainScope.backendApi.getReducedData(requestPage , 0 , "D1").then(function (dataPagesFunc){ //is reduced accordibng to the dimensions number 2^0 zoom factor
               for( let i = 0; i< topLength; i++) {
                   if( dataPages[0].qMatrix[0].qText ===  dataPagesFunc[0].qMatrix[0].qText) { //check the reduced tables if it is consist with the hypercube
                       okTest(me.id , me.desc , t.finish());
                   } else {
                      failTest(me.id, me.desc, t.finish(), "reduced Hypercube qText is "+ dataPagesFunc.qMatrix[0][0].qText +", expected " + dataPages.qMatrix[0][0].qText);
                   }
               }
               dfd.resolve();
           });
            return dfd.promise;
        }, false);


        /** By George Tzanavaras, August 2017*/
        queueTest(" getStackedData ",function () {
            var t = benchmark();
            var me = this;
            var dfd = qlik.Promise.defer();
            var dataPages=layout.qHyperCube;
            let selectionState=currApp.selectionState();

            if(selectionState.selections.length > 0) {
                okTest(me.id , me.desc , t.finish());
            } else {
                failTest( me.id , me.desc , t.finish() , "getStackedData ");
            }
            dfd.resolve();
            return dfd.promise;
        }, false);
    }

    return {
        template: template,
        initialProperties: {
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [{
                    qWidth: 10,
                    qHeight: 20
                }]
            }
        },
        definition: {
            type: "items",
            component: "accordion",
            items: {
                dimensions: {
                    uses: "dimensions",
                    min: 1
                },
                measures: {
                    uses: "measures",
                    min: 1
                },
                sorting: {
                    uses: "sorting"
                }, settings: {
                    uses: "settings",
                    items: {
                        title: {
                            type: "string",
                            ref: "props.title",
                            label: "BeforeChange"
                        }
                    }
                }
            }
        },
        support: {
            snapshot: true,
            export: true,
            exportData: true
        },
        paint: function ($element, layout) {

            let mainScope = this;
            let backendApi=mainScope.backendApi;


            testCount = 0;
            Gelement = $element;
            resultElement = $element.find(".result");
            tbodyElement = $element.find("tbody");
            currApp = (currApp) ? currApp : qlik.currApp();
            currAppWithThis = (currAppWithThis) ? currAppWithThis : qlik.currApp(this);


            setUpRecallTests(mainScope, layout);
            runRecallTests();

            if (setProperty_done && !runNormalTestsStarted) {
                setUpNormalTests(mainScope, layout);
                runNormalTests();
                runNormalTestsStarted = true;
            }

            return qlik.Promise.resolve();

        },
        controller: ["$scope", function (/*$scope*/) {
        }]
    };
});
