// Will be overridden on page load. This is just the default
var urlRoot = "https://labs.networkreliability.engineering"

// This function generates a unique session ID so we can make sure you consistently connect to your lab resources on the back-end.
// We're not doing anything nefarious with this ID - this is just to make sure you have a good experience on the front-end.
function getSession() {
    var sessionCookie = document.cookie.replace(/(?:(?:^|.*;\s*)nreLabsSession\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    if (sessionCookie == "") {
        sessionId = makeid();
        document.cookie = "nreLabsSession=" + sessionId;
        return sessionId;
    }
    return sessionCookie;
}

function getLessonId() {
    var url = new URL(window.location.href);
    var lessonId = url.searchParams.get("lessonId");
    if (lessonId == null || lessonId == "") {
        console.log("lessonId not provided, so not attempting to load any lessons on this page.")
        console.log(url)
        return 0;
    }
    return parseInt(lessonId);
}

function getLessonStage() {
    var url = new URL(window.location.href);
    var lessonStage = url.searchParams.get("lessonStage");
    if (lessonStage == null || lessonStage == "") {
        console.log("Error: lessonStage not provided. Defaulting to 1.")
        return 1;
    }
    return parseInt(lessonStage);
}

// TODO(mierdin): build an extension to showdown so you don't have to provide the snippet index in the lesson guide
function runSnippetInTab(tabName, snippetIndex) {

    // Select tab
    $('.nav-tabs a[href="#' + tabName + '"]').tab('show')

    // TODO(mierdin): https://sourceforge.net/p/guacamole/discussion/1110834/thread/3243e595/
    // is this really the best way?
    // For each character in the given string
    var snippetText = document.getElementById('labGuide').getElementsByTagName('pre')[parseInt(snippetIndex)].innerText;
    for (var i=0; i < snippetText.length; i++) {

        // Get current codepoint
        var codepoint = snippetText.charCodeAt(i);

        // Convert to keysym
        var keysym;
        if (codepoint >= 0x0100)
            keysym = 0x01000000 | codepoint;
        else
            keysym = codepoint;

        // Press/release key
        terminals[tabName].guac.sendKeyEvent(1, keysym);
        terminals[tabName].guac.sendKeyEvent(0, keysym);
    }
}

function gotoTab(tabName) {
    $('.nav-tabs a[href="#' + tabName + '"]').tab('show')
}

function makeid() {
    var text = "";

    // must only be lower-case alphanumeric, since this will form
    // part of the kubernetes namespace name
    var possible = "0123456789abcdefghijklmnopqrstuvwxyz";

    for (var i = 0; i < 16; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function getRandomModalMessage() {
 
    // Include memes? https://imgur.com/gallery/y0LQyOV
    var messages = [
        "Sweeping technical debt under the rug...",
        "Definitely not mining cryptocurrency in your browser...",
        "Duct-taping 53 javascript frameworks together...",
        "Dividing by < ERR - DIVIDE BY ZERO. SHUTTING DOWN. AND I WAS JUST LEARNING TO LOVE.....>",
        "try { toilTime / automatingTime; } catch (DivideByZeroException e) { panic(“More NRE Labs”); }",
        "Thank you for your call. You've reached 1-800-NRE-Labs. Please hold for Dr. Automation.",
        "I'd tell you a joke about UDP, but you probably wouldn't get it.",
        "Now rendering an NRE's best friend for you to play fetch with.",
        "Our Lab-Retriever, CloudDog, is still a puppy. Thanks for your patience.",
        "Calculating airspeed velocity of an unladen swallow..."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function renderLessonCategories() {

    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", urlRoot + "/syringe/exp/lessondef/all", false);
    xhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhttp.send();

    if (xhttp.status != 200) {
        var errorMessage = document.getElementById("error-modal-body");
        errorMessage.innerText = "Error retrieving lesson categories: " + response["error"];
        $("#busyModal").modal("hide");
        $('#errorModal').modal({backdrop: 'static', keyboard: false})
        return
    }

    categories = JSON.parse(xhttp.responseText).lessonCategories;
    console.log("Received lesson defs fom syringe: ")
    console.log(categories)

    for (var category in categories) {
        var lessonDefs = categories[category].lessonDefs;

        for (var i = 0; i < lessonDefs.length; i++) {
            console.log("Adding lesson to menu - " + lessonDefs[i].LessonName)
            var lessonLink = document.createElement('a');
            lessonLink.classList.add('dropdown-item');
            lessonLink.href = "/labs/?lessonId=" + lessonDefs[i].LessonId + "&lessonStage=1";

            if (lessonDefs[i].JuniperSpecific == true) {
                var juniperImg = document.createElement('img');
                juniperImg.src = "/images/juniper-avatar-17x17.gif"
                juniperImg.alt="Juniper-Specific Lesson"
                juniperImg.style="height:17px"
                lessonLink.appendChild(juniperImg);
            }

            lessonLink.appendChild(document.createTextNode(lessonDefs[i].LessonName));
            document.getElementById(category+"Menu").appendChild(lessonLink);
        }

        // Populate quick start button with a random lesson
        var quickStartButton = document.getElementById("btn"+category);
        if (quickStartButton) {
            var rand = Math.floor(Math.random() * categories[category].lessonDefs.length)
            var randLessonId = categories[category].lessonDefs[rand].LessonId
            quickStartButton.href = "/labs/?lessonId=" + randLessonId + "&lessonStage=1"
        }
    }
}

function renderLessonStages() {
    var reqLessonDef = new XMLHttpRequest();

    // TODO(mierdin): This is the first call to syringe, you should either here or elsewhere, handle errors and notify user.

    // Doing synchronous calls for now, need to convert to asynchronous
    reqLessonDef.open("GET", urlRoot + "/syringe/exp/lessondef/" + getLessonId(), false);
    reqLessonDef.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    reqLessonDef.send();
    var lessonDefResponse = JSON.parse(reqLessonDef.responseText);

    if (reqLessonDef.status != 200) {
        var errorMessage = document.getElementById("error-modal-body");
        errorMessage.innerText = "Error retrieving lesson stages: " + lessonDefResponse["error"];
        $("#busyModal").modal("hide");
        $('#errorModal').modal({backdrop: 'static', keyboard: false})
        return 0;
    }

    for (var i = 1; i < lessonDefResponse.Stages.length; i++) {
        var sel = document.getElementById("lessonStagesDropdown");
        var stageEntry = document.createElement('option');
        stageEntry.innerText = i + " - " + lessonDefResponse.Stages[i].Description
        sel.appendChild(stageEntry);
    }

    document.getElementById("lessonStagesDropdown").selectedIndex = getLessonStage() - 1;

    return lessonDefResponse.Stages.length - 1;
}

function stageChange() {
    var newStage = parseInt(document.getElementById("lessonStagesDropdown").selectedIndex) + 1;
    window.location.href = ".?lessonId=" + getLessonId() + "&lessonStage=" + newStage;
}

async function requestLesson() {

    var lessonStageCount = renderLessonStages()

    // Obviously a problem happened, just return
    if (lessonStageCount == 0) {
        return
    }

    var myNode = document.getElementById("tabHeaders");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }

    var myNode = document.getElementById("myTabContent");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }

    var data = {};
    data.lessonId = getLessonId();
    data.sessionId = getSession();
    data.lessonStage = getLessonStage();

    var json = JSON.stringify(data);

    // Send lesson request
    // TODO(mierdin): for all these loops, need to break if we either get a non 200 status for too long,
    // or if the lesson fails to provision (ready: true) before a timeout. Can't just loop endlessly.
    // for (; ;) {
    //     var xhttp = new XMLHttpRequest();

    //     // Doing synchronous calls for now, need to convert to asynchronous
    //     xhttp.open("POST", urlRoot + "/syringe/exp/livelesson", false);
    //     xhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    //     xhttp.send(json);

    //     if (xhttp.status != 200) {
    //         await sleep(1000);
    //         continue;
    //     }
    //     break;
    // }

    // Send lesson request
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", urlRoot + "/syringe/exp/livelesson", false);
    xhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhttp.send(json);

    response = JSON.parse(xhttp.responseText);

    if (xhttp.status != 200) {
        var errorMessage = document.getElementById("error-modal-body");
        errorMessage.innerText = "Error with initial lesson request: " + response["error"];
        $("#busyModal").modal("hide");
        $('#errorModal').modal({backdrop: 'static', keyboard: false})
        return
    }

    var attempts = 1;

    // get livelesson
    for (; ;) {

        // Here we go get the livelesson we requested, verify it's ready, and once it is, start wiring up endpoints.
        var xhttp2 = new XMLHttpRequest();
        xhttp2.open("GET", urlRoot + "/syringe/exp/livelesson/" + response.id, false);
        // xhttp2.open("GET", "https://ptr.labs.networkreliability.engineering/syringe/exp/livelesson/12-jjtigg867ghr3gye", false);
        xhttp2.setRequestHeader('Content-type', 'application/json; charset=utf-8');
        xhttp2.send();

        if (xhttp2.status != 200) {
            var errorMessage = document.getElementById("error-modal-body");
            errorMessage.innerText = "Error retrieving requested lesson: " + response["error"];
            $("#busyModal").modal("hide");
            $('#errorModal').modal({backdrop: 'static', keyboard: false})
            return
        }

        var liveLessonDetails = JSON.parse(xhttp2.responseText);

        updateProgressModal(liveLessonDetails);

        if (liveLessonDetails.LiveLessonStatus != "READY") {

            if (attempts > 1200) {
                var errorMessage = document.getElementById("error-modal-body");
                errorMessage.innerText = "Timeout waiting for lesson to become ready.";
                $("#busyModal").modal("hide");
                $('#errorModal').modal({backdrop: 'static', keyboard: false})
                return
            }

            attempts++;
            await sleep(500);
            continue;
        }

        var endpoints = liveLessonDetails.LiveEndpoints;

        renderLabGuide(liveLessonDetails.LabGuide);

        var diagramButton = document.getElementById("btnOpenLessonDiagram");
        var diagram = document.getElementById("lessonDiagramImg");
        if (liveLessonDetails.LessonDiagram == null) {
            diagram.src = "/images/error.png";
            diagramButton.disabled = true;
            diagramButton.innerText = "No Lesson Diagram";
        } else {
            diagram.src = liveLessonDetails.LessonDiagram;
            diagramButton.disabled = false;
            diagramButton.innerText = "Open Lesson Diagram";
        }

        // Position the video button if a video is present for this lesson
        if (liveLessonDetails.LessonVideo != null) {
            document.getElementById("btnOpenLessonVideo").style = "text-align: center;"
            document.getElementById("lessonVideoIframe").src = liveLessonDetails.LessonVideo;
            document.getElementById("labGuide").style="padding-top: 10px;"
        }

        if (liveLessonDetails.JuniperSpecific == true) {
            var juniperTooltip = document.getElementById('juniperTooltip');
            juniperTooltip.style = "";
        }

        var nextLessonStage = parseInt(getLessonStage()) + 1
        console.log(nextLessonStage)
        console.log(lessonStageCount)
        if (nextLessonStage <= lessonStageCount) {
            document.getElementById("gotoNextStage").href = "/labs/?lessonId=" + getLessonId() + "&lessonStage=" + nextLessonStage
            $("#gotoNextStage").removeClass('disabled');
        } else {
            $("#gotoNextStage").addClass('disabled');
        }

        // for some reason, even though the syringe health checks work,
        // we still can't connect right away. Adding short sleep to account for this for now
        // TODO try removing this now that the health check is SSH based
        await sleep(2000);
        addTabs(endpoints);
        $("#busyModal").modal("hide");
        break;
    }
}


function updateProgressModal(liveLessonDetails) {

    var pBar = document.getElementById("liveLessonProgress");

    var statusMessageElement = document.getElementById("lessonStatus");
    switch(liveLessonDetails.LiveLessonStatus) {
        case "INITIAL_BOOT":
          totalEndpoints = 0;
          reachableEndpoints = 0;
          for (var property in liveLessonDetails.LiveEndpoints) {
              totalEndpoints++;
              if (liveLessonDetails.LiveEndpoints[property].Reachable == true) {
                  reachableEndpoints++;
              }
          }
          statusMessageElement.innerText = "Waiting for lesson endpoints to become reachable...(" + reachableEndpoints + "/" + totalEndpoints + ")"
          pBar.style = "width: 33%"
          break;
        case "CONFIGURATION":
          statusMessageElement.innerText = "Configuring endpoints for this lesson..."
          pBar.style = "width: 66%"
          break;
        case "READY":
          statusMessageElement.innerText = "Almost ready!"
          pBar.style = "width: 100%"
          break;
        default:
          // Shouldn't need this since we're getting rid of the default nil value on the syringe side, but just in case...
          totalEndpoints = 0;
          reachableEndpoints = 0;
          for (var property in liveLessonDetails.LiveEndpoints) {
              totalEndpoints++;
              if (liveLessonDetails.LiveEndpoints[property].Reachable == true) {
                  reachableEndpoints++;
              }
          }
          statusMessageElement.innerText = "Waiting for lesson endpoints to become reachable (" + reachableEndpoints + "/" + totalEndpoints + ")"
          pBar.style = "width: 33%"
      }
}

function renderLabGuide(labGuideText) {
    var converter = new showdown.Converter();
    var labHtml = converter.makeHtml(labGuideText);
    document.getElementById("labGuide").innerHTML = labHtml;
}

function rescale(browserDisp, guacDisp) {
    var scale = Math.min(browserDisp.offsetWidth / Math.max(guacDisp.getWidth(), 1), browserDisp.offsetHeight / Math.max(guacDisp.getHeight(), 1));
    console.log("Scale factor is: " + scale)
    guacDisp.scale(scale);
}

function sortEndpoints(endpoints) {

    var sortedEndpoints = [];

    for (var ep in endpoints) {
        if (endpoints[ep].Type == "UTILITY") {
            sortedEndpoints.push(endpoints[ep]);
        }
    }

    for (var ep in endpoints) {
        if (endpoints[ep].Type == "DEVICE") {
            sortedEndpoints.push(endpoints[ep]);
        }
    }

    for (var ep in endpoints) {
        if (endpoints[ep].Type == "IFRAME") {
            sortedEndpoints.push(endpoints[ep]);
        }
    }

    return sortedEndpoints
}

function addTabs(endpoints) {

    endpoints = sortEndpoints(endpoints);

    // Add Devices tabs
    for (var i = 0; i < endpoints.length; i++) {
        if (endpoints[i].Type == "DEVICE" || endpoints[i].Type == "UTILITY") {
            console.log("Adding " + endpoints[i].Name);
            var newTabHeader = document.createElement("LI");
            newTabHeader.classList.add('nav-item');

            var a = document.createElement('a');
            var linkText = document.createTextNode(endpoints[i].Name);
            a.appendChild(linkText);
            a.classList.add('nav-link');
            a.href = "#" + endpoints[i].Name;
            a.setAttribute("data-toggle", "tab");
            if (i == 0) {
                a.classList.add('active', 'show');
            }
            newTabHeader.appendChild(a);

            document.getElementById("tabHeaders").appendChild(newTabHeader);

            var newTabContent = document.createElement("DIV");
            newTabContent.id = endpoints[i].Name;
            newTabContent.classList.add('tab-pane', 'fade');
            if (i == 0) {
                newTabContent.classList.add('active', 'show');
            }
            // newTabContent.height="350px";
            // newTabContent.style.height = "350px";
            newTabContent.style="height: 100%;";

            var newGuacDiv = document.createElement("DIV");
            newGuacDiv.id = "display" + endpoints[i].Name
            // newGuacDiv.height="300px";
            // newGuacDiv.style.height = "300px";


            newTabContent.appendChild(newGuacDiv)

            document.getElementById("myTabContent").appendChild(newTabContent);

            console.log("Added " + endpoints[i].Name);
        } else if (endpoints[i].Type == "IFRAME") {
            console.log("Adding " + endpoints[i].Name);
            var newTabHeader = document.createElement("LI");
            newTabHeader.classList.add('nav-item');

            var a = document.createElement('a');
            var linkText = document.createTextNode(endpoints[i].Name);
            a.appendChild(linkText);
            a.classList.add('nav-link');
            a.href = "#" + endpoints[i].Name;
            a.setAttribute("data-toggle", "tab");
            if (i == 0) {
                a.classList.add('active', 'show');
            }
            newTabHeader.appendChild(a);

            document.getElementById("tabHeaders").appendChild(newTabHeader);

            var newTabContent = document.createElement("DIV");
            newTabContent.id = endpoints[i].Name;
            newTabContent.style = "width: 100%; height: 100%;"
            newTabContent.classList.add('tab-pane', 'fade');
            if (i == 0) {
                newTabContent.classList.add('active', 'show');
            }

            var iframe = document.createElement('iframe');
            iframe.width = "100%"
            iframe.height = "100%"
            iframe.frameBorder = "0"
            iframe.src = urlRoot + "/" + getLessonId() + "-" + getSession() + "-ns-" + endpoints[i].Name + endpoints[i].IframePath
            newTabContent.appendChild(iframe);

            document.getElementById("myTabContent").appendChild(newTabContent);
            console.log("Added " + endpoints[i].Name);
        }
    }
    guacInit(endpoints);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function provisionLesson() {
    var modal = document.getElementById("modal-body");
    modal.removeChild(modal.firstChild);
    var modalMessage = document.createTextNode(getRandomModalMessage());
    modal.appendChild(modalMessage);
    $('#busyModal').modal({backdrop: 'static', keyboard: false})  

    requestLesson();
}

var terminals = {};
function guacInit(endpoints) {

    for (var i = 0; i < endpoints.length; i++) {
        if (endpoints[i].Type == "DEVICE" || endpoints[i].Type == "UTILITY") {

            var thisTerminal = {};

            var tunnel = new Guacamole.HTTPTunnel("../tunnel")

            var epName = endpoints[i].Name;

            console.log("Adding guac configuration for " + epName)

            thisTerminal.display = document.getElementById("display" + epName);
            thisTerminal.guac = new Guacamole.Client(
                tunnel
            );

            thisTerminal.guac.onerror = function (error) {
                console.log(error);
                console.log("Problem connecting to the remote endpoint.");
                return false
            };

            connectData = endpoints[i].Host + ";" + endpoints[i].Port + ";" + String(document.getElementById("myTabContent").offsetWidth) + ";" + String(document.getElementById("myTabContent").offsetHeight - 42);
            thisTerminal.guac.connect(connectData);

            thisTerminal.display.appendChild(thisTerminal.guac.getDisplay().getElement());

            // Disconnect on close
            window.onunload = function () {
                thisTerminal.guac.disconnect();
            }

            thisTerminal.mouse = new Guacamole.Mouse(thisTerminal.guac.getDisplay().getElement());

            thisTerminal.mouse.onmousedown =
                thisTerminal.mouse.onmouseup =
                thisTerminal.mouse.onmousemove = function(id) {
                    return function (mouseState) {
                        terminals[id].guac.sendMouseState(mouseState);
                    }
                }(epName);

            terminals[epName] = thisTerminal
        }
    }

    var tabs = document.getElementById("myTabContent").children;
    var keyboard = new Guacamole.Keyboard(document);
    keyboard.onkeydown = function (keysym) {
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.classList.contains("show")) {
                console.log(terminals[tab.id])
                terminals[tab.id].guac.sendKeyEvent(1, keysym);
            }
        }
    };
    keyboard.onkeyup = function (keysym) {
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.classList.contains("show")) {
                console.log(terminals[tab.id])
                terminals[tab.id].guac.sendKeyEvent(0, keysym);
            }
        }
    };

    console.log(terminals)
    return true
}

// Big honkin regex from https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
function isMobile() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};

// Run all this once the DOM is fully rendered so we can get a handle on the DIVs
document.addEventListener('DOMContentLoaded', function () {

    urlRoot = window.location.href.split('/').slice(0, 3).join('/');

    renderLessonCategories()

    if (getLessonId() != 0) {
        if (isMobile() == true) {
            alert("WARNING - NRE Labs doesn't yet support mobile. You can continue, but it likely won't work. Mobile support coming soon!")
        }    

        provisionLesson();
    }

    $('#videoModal').on('show.bs.modal', function () {
      $("#videoModal iframe").attr("src", "https://www.youtube.com/embed/YhbWBX71yGQ?autoplay=1&rel=0");
    });
    
    $("#videoModal").on('hidden.bs.modal', function (e) {
      $("#videoModal iframe").attr("src", null);
    });

    $("#lessonVideoModal").on('hidden.bs.modal', function (e) {
        // Just reset the `src` attribute, which will "un-play" the video
        $("#lessonVideoModal iframe").attr("src", document.getElementById("lessonVideoIframe"));
    });

    if (urlRoot.substring(0,11) == "https://ptr") {
        appendPTRBanner();
    }
});

function appendPTRBanner() {

    var buildInfoReq = new XMLHttpRequest();
    buildInfoReq.open("GET", urlRoot + "/syringe/exp/syringeinfo", false);
    buildInfoReq.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    buildInfoReq.send();

    if (buildInfoReq.status != 200) {
        console.log("Unable to get build info")
        return
    }
    var buildInfo = JSON.parse(buildInfoReq.responseText);

    console.log(buildInfo)

    var scripts = document.getElementsByTagName('script');
    var lastScript = scripts[scripts.length-1];
    var scriptName = lastScript.src;

    var commits = {
        "antidote": buildInfo.antidoteSha,
        "antidoteweb": scriptName.split("?")[1],
        "syringe": buildInfo.buildSha,
    }

    var antidoteLink = "<a target='_blank' href='https://github.com/nre-learning/antidote/commit/" + commits.antidote + "'>" + commits.antidote.substring(0,7) + "</a>"
    var antidoteWebLink = "<a target='_blank' href='https://github.com/nre-learning/antidote-web/commit/" + commits.antidoteweb + "'>" + commits.antidoteweb.substring(0,7) + "</a>"
    var syringeLink = "<a target='_blank' href='https://github.com/nre-learning/syringe/commit/" + commits.syringe + "'>" + commits.syringe.substring(0,7) + "</a>"

    var ptrBanner = document.createElement("DIV");
    ptrBanner.id = "ptrBanner"
    ptrBanner.style = "background-color: black;"
    ptrBanner.innerHTML = '<span style="color: red;"><p>NRE Labs Public Test Realm. Antidote: ' + antidoteLink + ' | Antidote-Web: ' + antidoteWebLink + ' | Syringe: ' + syringeLink + '</p></span>'

    document.body.appendChild(ptrBanner)
}

