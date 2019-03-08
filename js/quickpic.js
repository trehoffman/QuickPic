function QuickPic(config) {
    var me = this;

    me.config = config || {};
    me.ctx;
    me.currentCamera;
    me.elements = {
        container: null,
        main: {
            container: null,
            video: null,
            videoSource: null,
            canvas: null,
            take_picture_button: null,
            file_input: null
        },
        preview: {
            container: null,
            display: null,
            save_button: null
        }
    };
    me.file = new File();
    me.html = '<div id="quickpic" style="position:fixed;margin:0;padding:0;top:0;left:0;width:100%;height:100%;background-color:white;overflow:scroll;"><div class="main" style="width:100%;text-align:center;"><div><select class="videoSource"></select></div><div style="width:100%;"><video class="display" style="width:100%;height:100%;max-width:75%;max-height:75%;" autoplay></video><canvas style="display:none;"></canvas></div><div style="width:100%;"><div><button type="button" class="take-picture" style="width:90%;margin-bottom:10px;">Take Picture</button></div><div><input class="file" type="file" accept="image/*,.pdf" style="width:90%;margin-bottom:10px;" /></div><div><button type="button" class="cancel" style="width:90%;margin-bottom:10px;">Cancel</button></div></div></div><div class="preview" style="width:100%;text-align:center;display:none;"><img src="" style="width:100%;height:100%;max-width:75%;max-height:75%;" /><div style="width:100%;"><div><button type="button" class="save" style="width:90%;margin-bottom:10px;">Save</button></div><div><button tpye="button" class="cancel" style="width:90%;margin-bottom:10px;">Cancel</button></div></div></div></div>';
    me.id = 'quickpic';
    me.videoSources = [];
    
    me.init = function() {
        for (var property in config) {
            if (config.hasOwnProperty(property)) {
                me[property] = config[property];
            }
        }

        if (!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia)) {
            alert('getUserMedia() is not supported in your browser');
            return;
        }
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

        me.show();
        me.startEventListeners();
        me.getSources();
        me.startVideoStream();
    };

    me.captureImage = function () {
        if (window.stream) {
            me.ctx.drawImage(me.elements.main.video, 0, 0);
            var base64 = me.elements.main.canvas.toDataURL('image/jpeg');
            me.file.set('base64', base64);
        };
    };

    me.close = function() {
        if (window.stream) {
            me.elements.main.video.src = null;
            window.stream.getVideoTracks()[0].stop();
        }
        me.elements.container.outerHTML = '';
    };

    me.closePreview = function() {
        me.elements.preview.container.style.display = 'none';
        me.elements.main.container.style.display = 'block';
        me.elements.main.take_picture_button.focus();
    };

    me.getSources = function() {
        if (MediaStreamTrack.getSources) {
            MediaStreamTrack.getSources(function (sources) {
                me.videoSources = me.getVideoSources(sources);
                me.populateSources();
            });
        } else if (navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(function (sources) {
                me.videoSources = me.getVideoSources(sources);
                me.populateSources();
            }).catch(function (err) {
                console.log(err);
                alert('error');
            });
        } else {
            alert("Enumeration of Video Devices on this Browser is not yet supported.");
        }
    };

    me.getVideoSources = function (sources) {
        var videoSources = [];

        if (!sources) {
            return videoSources;
        }

        for (var i = 0; i != sources.length; ++i) {
            var source = sources[i];
            var option = document.createElement("option");
            option.value = source.deviceId;
            if (source.kind === 'audio') {
                //do nothing
            } else if (source.kind === 'video') {
                option.text = source.label || 'camera ' + (videoSources.length + 1);
                videoSources.push(option);
            } else if (source.kind === "videoinput") {
                option.text = source.label || 'camera ' + (videoSources.length + 1);
                videoSources.push(option);
            } else {
                //console.log('Some other kind of source: ', sourceInfo);
            }
        }

        return videoSources;
    };

    me.openPreview = function () {
        if ((me.file.base64.length == 0) || (me.file.base64 == 'data:,')) {
            setTimeout(me.openPreview, 500);
            return;
        }
        
        me.elements.preview.container.style.display = 'block';
        me.elements.main.container.style.display = 'none';
        me.elements.preview.display.src = me.file.base64;
        me.elements.preview.save_button.focus();
    };

    me.populateSources = function () {
        me.elements.main.videoSource.innerHTML = '';
        for (var i = 0; i < this.videoSources.length; i++) {
            var videoSource = this.videoSources[i];
            me.elements.main.videoSource.options.add(videoSource);
        }
    };

    me.send = function (name, detail) {
        var event = new CustomEvent(name, {
            detail: detail
        });
        document.dispatchEvent(event);
    };

    me.sendFile = function() {
        me.send('quickpicresults', me.file);
    };

    me.show = function() {
        document.body.innerHTML += me.html;
        me.elements.container = document.querySelector('#' + me.id);

        me.elements.main.container = me.elements.container.querySelector('div.main');
        me.elements.main.video = me.elements.main.container.querySelector('video.display');
        me.elements.main.videoSource = me.elements.main.container.querySelector('select.videoSource');
        me.elements.main.canvas = me.elements.main.container.querySelector('canvas');
        me.elements.main.take_picture_button = me.elements.main.container.querySelector('button.take-picture');
        me.elements.main.file_input = me.elements.main.container.querySelector('input[type=file].file');

        me.elements.preview.container = me.elements.container.querySelector('div.preview');
        me.elements.preview.display = me.elements.preview.container.querySelector('img');
        me.elements.preview.save_button = me.elements.preview.container.querySelector('button.save');
        
        me.ctx = me.elements.main.canvas.getContext('2d');

        me.elements.main.take_picture_button.focus();
    };

    me.startEventListeners = function() {
        me.elements.main.container.addEventListener('change', function (e) {
            if (e.target.classList.contains('videoSource')) {
                me.startVideoStream();
            } else if (e.target.classList.contains('file')) {
                var file = e.target.files[0];
                me.file.set('file', file);
                me.file.readFile(function() {
                    me.sendFile();
                    me.close();
                });
            }
        });

        me.elements.main.container.addEventListener('click', function(e) {
            if (e.target.classList.contains('cancel')) {
                me.close();
            } else if (e.target.classList.contains('take-picture')) {
                me.captureImage();
                me.openPreview();
            }
        });

        me.elements.main.video.addEventListener("loadedmetadata", function (e) {
            me.elements.main.canvas.width = this.videoWidth;
            me.elements.main.canvas.height = this.videoHeight;
        }, false);

        me.elements.preview.container.addEventListener('click', function(e) {
            if (e.target.classList.contains('save')) {
                me.sendFile();
                me.close();
            } else if (e.target.classList.contains('cancel')) {
                me.closePreview();
            }
        });

        document.addEventListener('fileread', function(e) {
            console.log(e);
        });
    };

    me.startVideoStream = function () {
        if (window.stream) {
            me.elements.main.video.src = null;
            window.stream.getVideoTracks()[0].stop();
        }
        me.currentCamera = me.elements.main.videoSource.value;
        var constraints = {
            video: {
                optional: [{
                    sourceId: me.currentCamera
                }]
            }
        };

        navigator.getUserMedia(constraints, function (stream) {
            window.stream = stream;
            try {
                me.elements.main.video.srcObject = stream;
            } catch (error) {
                me.elements.main.video.src = URL.createObjectURL(stream);
            }
            me.elements.main.video.play();
        }, function (error) {
            console.log('Error', error);
        });
    };

    me.init();
}

function File(config) {
    var me = this;
    me.config = config || {};
    me.file;
    me.base64;
    me.type;
    me.extension;
    me.supported;

    me.init = function() {
        for (var property in config) {
            if (config.hasOwnProperty(property)) {
                me[property] = config[property];
            }
        }
    };

    me.compileFromBase64 = function() {
        try {
            var base64 = me.base64;
            var info = base64.split(';')[0].split(':')[1].split('/');
            me.type = (info[0] || '');
            me.extension =  (info[1] || '');
            
            if ((me.supported_types) && (me.supported_types.indexOf(me.type) == -1)) {
                me.supported = false;
                return false;
            }

            if ((me.supported_extensions) && (me.supported_extensions.indexOf(me.extension) == -1)) {
                me.supported = false;
                return false;
            }
            
            me.supported = true;
            return true;
        } catch (error) {
            console.log(error);
            me.type = '';
            me.extension = '';
            me.supported = false;
        }
    };

    me.compileFromFile = function() {
        try {
            var file = me.file;
            var info = file.type.split('/');

            me.base64 = null;

            me.type = info[0];
            me.extension = info[1];
            
            me.lastModified = file.lastModified;
            me.lastModifiedDate = file.lastModifiedDate;
            me.name = file.name;
            me.size = file.size;
            me.webkitRelativePath = file.webkitRelativePath;

            if ((me.supported_types) && (me.supported_types.indexOf(me.type) == -1)) {
                me.supported = false;
                return false;
            }

            if ((me.supported_extensions) && (me.supported_extensions.indexOf(me.extension) == -1)) {
                me.supported = false;
                return false;
            }
            
            me.supported = true;
            return true;
        } catch (error) {
            console.log(error);
            me.type = null;
            me.extension = null;
            me.supported = null;
        }
    };

    me.readFile = function(callback) {
        var file = me.file;
        var reader = new FileReader();

        reader.addEventListener("load", function () {
            me.base64 = reader.result;
            if (callback) callback();
        }, false);

        if (file) {
            reader.readAsDataURL(file);
        }
    };

    me.send = function (name, detail) {
        var event = new CustomEvent(name, {
            detail: detail
        });
        document.dispatchEvent(event);
    };

    me.set = function(field, value) {
        me[field] = value;

        switch(field) {
            case 'base64':
                me.compileFromBase64();
                break;
            case 'file':
                me.compileFromFile();
                break;
            default: 
                break;
        }
    };

    me.init();
}