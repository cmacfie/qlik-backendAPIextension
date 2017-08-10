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

    var recallsDone = false;
    var testCount = 0;

    var runOnceFlag = false;

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
        var id = ++testCount;
        var html = '<td>' + id + '</td><td>' + description + '</td><td class="queue_result"></td><td class="queue_benchmark"></td>';

        /** Only add it if a test with the description doesn't already exist */
        if (document.documentElement.innerHTML.indexOf(description) === -1) {
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

    function runTests() {
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

    return {
        template: template,
        initialProperties: {
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [{
                    qWidth: 10,
                    qHeight: 5
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
                    min: 0
                },
                sorting: {
                    uses: "sorting"
                }
                , settings: {
                    uses: "settings",
                    items: {
                        title: {
                            type: "string",
                            ref: "props.testtitle",
                            label: "TestTitle",
                            defaultValue: "testingtitle"
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

            Gelement = $element;
            resultElement = $element.find(".result");
            tbodyElement = $element.find("tbody");
            currApp = (currApp) ? currApp : qlik.currApp();
            currAppWithThis = (currAppWithThis) ? currAppWithThis : qlik.currApp(this);

            /** Advanced test because setProperty recalls paint. What code to execute kept track of via flags.
             * 1. Verify that title and the change the title
             * 2. Verify the change and then change it back for next round */
            queueTest("setProperty", function () {
                var t = benchmark();
                var me = this;
                var dfd = qlik.Promise.defer();
                mainScope.backendApi.getProperties().then(function (propsBefore) {
                    if (propsBefore.props.testtitle === "testingtitle" && !setProperty_testInProgress && !setProperty_done) {
                        setProperty_stage = 2;
                        setProperty_testInProgress = true;
                        propsBefore.props.testtitle = "testingtitle2";
                        mainScope.backendApi.setProperties(propsBefore);
                    } else if (propsBefore.props.testtitle === "testingtitle2" && setProperty_testInProgress) {
                        setProperty_stage = 3;
                        propsBefore.props.testtitle = "testingtitle";
                        mainScope.backendApi.setProperties(propsBefore);
                    } else if (propsBefore.props.testtitle === "testingtitle" && setProperty_testInProgress) {
                        setProperty_testInProgress = false;
                        setProperty_done = true;
                        recallsDone = true;
                        okTest(me.id, me.desc, t.finish());
                        dfd.resolve();
                    } else {
                        var failMessage = "";
                        switch (setProperty_stage) {
                            case 1 :
                                failMessage = "Expected title === 'testingtitle, was " + propsBefore.props.testtitle;
                                break;
                            case 2 :
                                failMessage = "Expected title === 'testingtitle2, was " + propsBefore.props.testtitle;
                                break;
                            case 3 :
                                failMessage = "Expected title === 'testingtitle, was " + propsBefore.props.testtitle;
                                break;
                            default :
                                failMessage = "testtitle was " + propsBefore.props.testtitle;
                                break;
                        }
                        setProperty_done = true;
                        failTest(me.id, me.desc, t.finish(), failMessage);
                        dfd.resolve();
                    }
                });
                return dfd.promise;
            }, true);

            /** Either first lap to fill the table with the tests, or last rerun to actually execute them */
            if (setProperty_stage === 3 && !runOnceFlag) {

                queueTest("getProperty", function () {
                    var t = benchmark();
                    var me = this;
                    var dfd = qlik.Promise.defer();
                    mainScope.backendApi.getProperties().then(function (propsBefore) {
                        if (propsBefore.props.testtitle === "testingtitle") {
                            okTest(me.id, me.desc, t.finish());
                            dfd.resolve();
                        } else {
                            failTest(me.id, me.desc, t.finish(), "Expected title === 'TestingTitle', was " + propsBefore.props.title);
                            dfd.resolve();
                        }
                    });
                    return dfd.promise;
                }, false);

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

                //TODO Figure out if works
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


                runTests();
                runOnceFlag = true;
            }

            runRecallTests();

            return qlik.Promise.resolve();
        },
        controller: ['$scope', function (/*$scope*/) {
        }]
    };
});


