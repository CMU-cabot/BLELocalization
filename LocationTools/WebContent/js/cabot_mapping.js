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
            'group' : 'attachments',
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
        uploadFloorplan(metadata, uploadData, imageFile, callback);
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
    
    function processMap(key, files, callback) {
        var yamlFile = null;
        var imageFile = null;
        for(const file of files) {
            var path = file.webkitRelativePath || file.name;
            if (path.includes(".txt")) {
                console.log(".txt", path);
                yamlFile = file;
            }
            if (path.includes('.png')) {
                console.log(".png", path);
                imageFile = file;
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
            };
            uploadFloorplan(metadata, uploadData, imageFile, callback);
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

function uploadFloorplan(metadata, uploadData, imageFile, callback){
    var reader = new FileReader();
    reader.onload = function () {
        var img = new Image();
        img.onload = function () {
            var width = img.width;
            var height = img.height;
            var formData = new FormData();
            formData.append('file', imageFile, imageFile.name);
            console.log(formData);
            dataUtil.postFormData({
                'type': "file",
                'data': formData,
                'method': 'POST',
                'success': function (data) {
                    console.log(data);
                    uploadData.width = width;
                    uploadData.height = height;
                    uploadData.filename = data.filename
                    console.log(uploadData);
                    dataUtil.postData({
                        'type': floorplanDataType,
                        'data': {
                            '_metadata': JSON.stringify(metadata),
                            'data': JSON.stringify(uploadData)
                        },
                        'success': function (data) {
                            console.log(data);
                            callback();
                        },
                        'error': function (xhr, text, error) {
                            $('#message').text(error || text);
                        }
                    });
                },
                'error': function (xhr, text, error) {
                    $('#message').text(error || text);
                }
            });
        }
        img.src = reader.result;
    }
    reader.readAsDataURL(imageFile);
}
