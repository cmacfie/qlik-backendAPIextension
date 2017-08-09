define(["qlik", "jquery", "text!./style.css", "text!./template.html"], function (qlik, $, cssContent, template) {
    'use strict';
    $("<style>").html(cssContent).appendTo("head");

    var testCount = 0, okCount = 0, tests = {};
    var promisesArray = [];

    var Gelement, resultElement, tbodyElement;

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

    function queueTest(description, promise) {
        console.log("test: " + description + " is queued");
        var id = ++testCount;
        var html = '<td>' + id + '</td><td>' + description + '</td><td class="queue_result"></td><td class="queue_benchmark"></td>';
        tbodyElement.append('<tr class="queue_' + id + '"></tr>');
        tbodyElement.find("tr:last").append(html);

        promisesArray.push(promise.bind({id: id, desc: description}));
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
                }, appearance : {
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


            testCount = 0;
            Gelement = $element;
            resultElement = $element.find(".result");
            tbodyElement = $element.find("tbody");
            tbodyElement.empty();
            currApp = (currApp) ? currApp : qlik.currApp();
            currAppWithThis = (currAppWithThis) ? currAppWithThis : qlik.currApp(this);


            queueTest("getData", function () {
                var t = benchmark();
                var me = this;
                var dfd = qlik.Promise.defer();
                let dataAtStart = layout.qHyperCube.qDataPages[0].qMatrix.length;
                if(dataAtStart === 5){
                    let lastrow = layout.qHyperCube.qDataPages[0].qMatrix.length-1;
                    if (mainScope.backendApi.getRowCount() >= lastrow + 1) {
                        var requestPage = [{
                            qTop: lastrow+1,
                            qLeft: 0,
                            qWidth: 4,
                            qHeight: 2
                        }];
                        //Get mroe data
                        mainScope.backendApi.getData(requestPage).then(function(promise){
                            //Sum the length of all pages
                            var totalLength = 0;
                            layout.qHyperCube.qDataPages.forEach(function(page){
                                totalLength += page.qMatrix.length;
                            });
                            //Verify that the new total length is 7
                            if(totalLength === 7){
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
            });

            queueTest("getRowCount", function () {
                var t = benchmark();
                var me = this;
                var dfd = qlik.Promise.defer();
                let getRowCount = mainScope.backendApi.getRowCount();
                let layoutSize = layout.qHyperCube.qSize.qcy;
                if(getRowCount === layoutSize){
                    okTest(me.id, me.desc, t.finish());
                    dfd.resolve();
                } else {
                    failTest(me.id, me.desc, t.finish(), "getRowCount was " + getRowCount + ", expected " + layoutSize);
                    dfd.resolve();
                }
                return dfd.promise;
            });

            console.log(this.backendApi.getProperties());
            queueTest("save", function () {
                mainScope.backendApi.getProperties().then(function(promise){
                    if(promise.title === "BeforeChange"){
                        promise.title = "AfterChange";
                        mainScope.backendApi.setProperties(promise);
                        mainScope.backendApi.getProperties().then(function(promise){
                            promise.
                        }
                    } else {

                    }
                    console.log(promise);
                    promise.s
                    mainScope.backendApi.setProperties()
                });
            });

            runTests();
            return qlik.Promise.resolve();
        },
        controller: ['$scope', function (/*$scope*/) {
        }]
    };
});


/** Fill with all available rows, add  */
function fillWithRows(me){
    var rowCount = me.backendApi.getRowCount();
    var requestPage = [{
        qTop: me.$element.find(".infoSquare").length,
        qLeft: 0,
        qWidth: 4,
        qHeight: 5000
    }];
    me.backendApi.getData(requestPage).then(function () {
        me.paint(me);
    });
    addInfoBox(me.backendApi.getRowCount());
}

