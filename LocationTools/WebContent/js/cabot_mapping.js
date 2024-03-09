function exportMaps(exportName) {
    let maps = floorplans.filter((e) => { return e.group == "mapping";});
    data = {
        maps: {
            map_list: []
        },
        attachment: []
    };
    let selected_map = $('input[group="anchor"]:checked').prop("obj");
    var floors = {}
    maps.forEach((f) => {
        if (f.attachment !== undefined) {
            data.attachment.push(...f.attachment);
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
            load_state_filename: `package://${DB_NAME}/maps/${name}.pbstream`,
            samples_filename: `package://${DB_NAME}/maps/${name}.loc.samples.json`,
            map_filename: `package://${DB_NAME}/maps/${name}.yaml`,
        })
    });

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
    function processMap(key, files, callback) {
        var yamlFile = null;
        var imageFile = null;
        var attachments = [];
        for(const file of files) {
            var path = file.webkitRelativePath || file.name;
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

            function uploadAttachment() {
                if (attachments.length == 0) {
                    uploadFloorplan(metadata, uploadData, callback);
                } else {
                    attachment = attachments.shift()
                    uploadFile(attachment, (filename) => {
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
    var count = 0;
    for (const key of keys) {
        processMap(key, prefixMap[key], callback = () => {
            count++;
            if (count == keys.length) {
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
