/*******************************************************************************
 * Copyright (c) 2024  Carnegie Mellon University
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *******************************************************************************/

var floorplanDataType = "floorplans";

function importMapYamlFromData() {
    dataUtil.getData({
        'type': floorplanDataType,
        'data': {
            'query': JSON.stringify({

            }),
            'sort': JSON.stringify({
                '_id': -1
            })
        },
        'success': function (data) {
            floorplans = data;
            let maps = floorplans.filter((e) => { return e.group == "mapping"; });
            data = getMapsJson(maps, maps[0]);
            createJsonEditor(data.maps);
        },
        'error': function (xhr, text, error) {
            $('#message').text(error || text);
        }
    });
}


function createJsonEditor(maps) {
    if (!$('#editor_holder').is(':empty')) {
        let response = window.confirm("Do you want to overwrite the editor?");
        if (!response) {
            return;
        }
        $("#editor_holder").empty();
    }

    jsonEditor = new JSONEditor($("#editor_holder")[0], {
        ajax: true,
        disable_edit_json: true,
        iconlib: "spectre",
        schema: {
            $ref: "../schema/map_config.json",
        },
        show_opt_in: true,
        startval: maps,
        theme: "spectre",
    });
}

function exportMapYaml() {
    let data = jsonEditor.getValue();
    var actionURL = 'data?' + $.param({
        'dummy' : new Date().getTime(),
        'export' : "maps.yaml",
        'filename' : "maps.yaml",
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

function importMapYaml(files) {
    if (files.length != 1) {
        return;
    }
    var fr = new FileReader();
    fr.onload = () => {
        $.ajax({
            url: 'data',
            type: 'POST',
            data: {
                data: fr.result,
                convert: 'yaml2json'
            },
            dataType: "json",
            success: function(maps) {
                //console.log("Converted JSON:", response);
                //var maps = JSON.parse(response);
                createJsonEditor(maps);
            },
            error: function(xhr, status, error) {
                console.log("Error:", error);
            }
        });
    }
    fr.readAsText(files[0]);
}