function exportMaps(exportName) {
    let maps = floorplans.filter((e) => { return e.group == "mapping";});
    let selected_map = $('input[group="anchor"]:checked').prop("obj");
    data = getMapsJson(maps, selected_map);

    var actionURL = 'data?' + $.param({
        'dummy' : new Date().getTime(),
        'export' : exportName,
        'filename' : exportName,
    });
    $('form#maps_form').remove();
    var form = $('<form>', {
        'id' : 'maps_form',
        'method' : 'post',
        'action' : actionURL
    }).append($('<input>', {
        'type' : 'hidden',
        'name' : 'maps',
        'value' : JSON.stringify(data),
    })).appendTo($('body')).submit();
}

function getMapsJson(maps, selected_map) {
    data = {
        maps: {
            map_list: []
        },
        attachment: []
    };
    var floors = {}
    maps.forEach((f) => {
        extra = {};
        package_prefix = `package://${DB_NAME}/maps`
        if (f.attachment !== undefined) {
            data.attachment.push(...f.attachment);
            f.attachment.forEach((a) => {
                let exts = [".pbstream", ".loc.samples.json", ".pgm", ".xcf", ".yaml"]
                for(let ext of exts) {
                    if (a.filename.endsWith(ext)) {
                        return;
                    }
                }
                if (a.filename.endsWith(".pbstream")) {
                    var count = 2;
                    while (`load_state_filename${count}` in extra) {
                        count++;
                    }
                    extra[`load_state_filename${count}`] = `${package_prefix}/${a.filename}`;
                }
                if (a.filename.endsWith(".json")) {
                    var count = 2;
                    while (`samples_filename${count}` in extra) {
                        count++;
                    }
                    extra[`samples_filename${count}`] = `${package_prefix}/${a.filename}`;
                }
                if (a.filename.endsWith(".yaml")) {
                    var count = 2;
                    while (`map_filename${count}` in extra) {
                        count++;
                    }
                    extra[`map_filename${count}`] = `${package_prefix}/${a.filename}`;
                }
            })
        }
        if (selected_map === f) {
            data.maps.anchor = {
                latitude: f.lat,
                longitude: f.lng,
                rotate: f.rotate,
                floor: f.floor,
            }
        }
        let name = f._metadata.name;
        let floor = f.floor;
        floors[floor] = floors[floor] || 0;
        let area = floors[floor]++;
        data.maps.map_list.push({
            node_id: `carto${floor}_${area}`,
            frame_id: `map_carto${floor}_${area}`,
            latitude: f.lat,
            longitude: f.lng,
            rotate: f.rotate,
            floor: floor,
            area: area,
            load_state_filename: `${package_prefix}/${name}.pbstream`,
            samples_filename: `${package_prefix}/${name}.loc.samples.json`,
            map_filename: `${package_prefix}/${name}.yaml`,
        });
        if (Object.keys(extra).length > 0) {
            Object.assign(data.maps.map_list[data.maps.map_list.length-1], extra);
        }
    });
    return data;
}

/*
    importAttachments will read files from a directory
    if floorplans.json file is found, it will try to upload all the floorplans including images
*/
function importAttachments(files){
    var imageFileMap = {};
    function processFloorplan(floorplan, callback) {
        console.log(floorplan);
        var imageName = floorplan["image"].split("/").pop();
        var imageFile = imageFileMap[imageName];
        if (imageFile == null) {
            console.log(`could not find ${imageName}`);
        }
        var id = floorplan["id"];
        var metadata = {
            'name': id,
            'comment': 'imported from attachments',
        };
        var uploadData = {
            'type' : 'floormap',
            'group' : 'MapService',
            'floor' : floorplan.floor,
            'origin_x' : floorplan.origin_x,
            'origin_y' : floorplan.origin_y,
            'ppm_x' : floorplan.ppm_x,
            'ppm_y' : floorplan.ppm_y,
            'lat' : floorplan.lat,
            'lng' : floorplan.lng,
            'rotate' : floorplan.rotate,
            'zIndex' : floorplan.zIndex,
        };
        getImageSize(imageFile, (width, height) => {
            uploadData.width = width;
            uploadData.height = height;
            uploadFile(imageFile, (filename) => {
                uploadData.filename = filename
                uploadFloorplan(metadata, uploadData, (data) => {
                    console.log(data);
                    callback();
                });
            });
        });
    }

    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var path = file.webkitRelativePath || file.name;

        if (path.includes("floormaps.json")) {
            console.log(`found ${path}`)
            var fr = new FileReader()
            fr.onload = () => {
                var floorplans = JSON.parse(fr.result);
                var count = 0;
                for (var j = 0; j < floorplans.length; j++) {
                    processFloorplan(floorplans[j], () => {
                        count++;
                        if (count == floorplans.length) {
                            refresh();
                        }
                    });
                }
                
            }
            fr.readAsText(file);
        } else {
            filename = path.split('/').pop();
            imageFileMap[filename] = file;
        }
    }
}

function importMappingData(files) {
    function processMap(key, files, mapProgress, callback) {
        var yamlFile = null;
        var imageFile = null;
        var attachments = [];
        for(const file of files) {
            var path = file.webkitRelativePath || file.name;

            // ignore hidden files
            var lastPathComponent = path.split("/").pop();
            if (lastPathComponent.startsWith(".")) {
                continue;
            }

            if (path.includes(".txt")) {
                console.log(".txt", path);
                yamlFile = file;
            }
            else if (path.includes('.png')) {
                console.log(".png", path);
                imageFile = file;
            }
            else {
                attachments.push(file);
            }
        }

        if (yamlFile == null || imageFile == null) {
            $('#message').text(`Mapping data (${key}) should have .txt and .png files`);
            return;
        }
        let fr = new FileReader();
        fr.onload = () => {
            console.log(fr.result);
            let yaml = simpleYAMLParse(fr.result);
            console.log("txt, yaml", yaml);
            // upload file
            lnglat = ol.proj.transform(gmap.getView().getCenter(), 'EPSG:3857', 'EPSG:4326');
            var metadata = {
                'name': key,
                'comment': 'imported from mapping data',
            };
            var uploadData = {
                'type': 'floormap',
                'group': 'mapping',
                'floor': 0,
                'origin_x': yaml.origin_x,
                'origin_y': yaml.origin_y,
                'ppm_x': yaml.ppm,
                'ppm_y': yaml.ppm,
                'lat': lnglat[1],
                'lng': lnglat[0],
                'rotate': 0,
                'zIndex': 0,
                'attachment': [],
            };

            let totalUploadCount = 2 + attachments.length;
            var count = 0;
            function progress() {
                count++;
                $("#progress").text(`upload progress: ${count}/${totalUploadCount} files - ${mapProgress()}`);
            }
            function uploadAttachment() {
                if (attachments.length == 0) {
                    uploadFloorplan(metadata, uploadData, function() {
                        progress();
                        callback();
                    });
                } else {
                    attachment = attachments.shift()
                    uploadFile(attachment, (filename) => {
                        progress();
                        uploadData.attachment.push({
                            "filename": attachment.name,
                            "id": filename,
                        });
                        uploadAttachment();
                    });
                }
            }

            getImageSize(imageFile, (width, height) => {
                uploadData.width = width;
                uploadData.height = height;
                uploadFile(imageFile, (filename) => {
                    progress();
                    uploadData.filename = filename;
                    uploadAttachment();
                });
            });
        }
        fr.readAsText(yamlFile);
    }

    var prefixMap = {}
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var path = file.webkitRelativePath || file.name;
        filename = path.split('/').pop();
        prefix = filename.split('.')[0];
        prefixMap[prefix] = prefixMap[prefix] || [];
        prefixMap[prefix].push(file);
    }

    let keys = Object.keys(prefixMap);
    function progress() {
        return `${keys.length - count} maps to be uploaded`
    }
    var count = 0;
    for (const key of keys) {
        processMap(key, prefixMap[key], progress, callback = () => {
            count++;
            if (count == keys.length) {
                $("#progress").text("");
                refresh();
            }
        });
    }
}

function getImageSize(imageFile, callback) {
    var reader = new FileReader();
    reader.onload = function () {
        var img = new Image();
        img.onload = function () {
            callback(img.width, img.height);
        }
        img.src = reader.result;
    }
    reader.readAsDataURL(imageFile);
}

function uploadFile(imageFile, callback){
    var formData = new FormData();
    formData.append('file', imageFile, imageFile.name);
    console.log(formData);
    dataUtil.postFormData({
        'type': "file",
        'data': formData,
        'method': 'POST',
        'success': function (data) {
            callback(data.filename);
        },
        'error': function (xhr, text, error) {
            $('#message').text(error || text);
        }
    });
}

function uploadFloorplan(metadata, uploadData, callback) {
    dataUtil.postData({
        'type': floorplanDataType,
        'data': {
            '_metadata': JSON.stringify(metadata),
            'data': JSON.stringify(uploadData)
        },
        'success': function (data) {
            callback(data);
        },
        'error': function (xhr, text, error) {
            $('#message').text(error || text);
        }
    });
}

function simpleYAMLParse(yamlString) {
    let obj = {};
    let lines = yamlString.split('\n');
    for (let line of lines) {
        console.log(line);
        if (line.trim() === '' || line.trim().startsWith('#')) continue;
        let [key, value] = line.split(/:(.+)/);
        if (key && value !== undefined) {
            key = key.trim();
            value = parseFloat(value.trim());
            obj[key] = value;
        }
    }
    return obj;
}
