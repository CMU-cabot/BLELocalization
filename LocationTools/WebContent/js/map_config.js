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

$(document).ready(() => {
    $("button").button();
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
            createJsonEditor();
        },
        'error': function (xhr, text, error) {
            $('#message').text(error || text);
        }
    });
})

function createJsonEditor() {
    let maps = floorplans.filter((e) => { return e.group == "mapping"; });
    data = getMapsJson(maps, maps[0]);
    console.log(data.maps);

    jsonEditor = new JSONEditor($("#editor_holder")[0], {
        ajax: true,
        theme: "spectre",
        iconlib: "spectre",
        schema: {
            $ref: "../schema/map_config.json",
        },
        startval: data.maps
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