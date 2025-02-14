<%@page import="org.apache.wink.json4j.JSONObject"%>
<jsp:useBean id="userBean" scope="request" class="hulo.commons.users.UserBean" />
<jsp:useBean id="databaseBean" scope="request" class="hulo.commons.bean.DatabaseBean" />
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%
String db = request.getParameter("db");
if (!databaseBean.existsDB(db)) {
	response.sendError(HttpServletResponse.SC_BAD_REQUEST);
	return;
}
String dbname = (db == null) ? "(default)" : "("+db+")";

JSONObject profile = (JSONObject)userBean.getProfile(request);
if (profile == null || !userBean.isDbAllowed(request, db)) {
	response.sendRedirect("user_login.jsp?logout=true&redirect_url=" + db + "/cabot_mapping.jsp");
	return;
}
%>
<!DOCTYPE html>
<!----------------------------------------------------------------------------
Copyright (c) 2014, 2023 IBM Corporation
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
------------------------------------------------------------------------------>
<html>
<head>
<meta charset="UTF-8">
<title>CaBot Mapping <%= dbname %></title>

<script type="text/javascript"
	src="js/lib/jquery/jquery-1.11.3.min.js"></script>
<link rel="stylesheet" type="text/css"
	href="js/lib/jquery-ui-1.11.4/jquery-ui.min.css">
<script type="text/javascript"
	src="js/lib/jquery-ui-1.11.4/jquery-ui.min.js"></script>
<link rel="stylesheet" type="text/css"
	href="js/lib/DataTables-1.10.10/media/css/jquery.dataTables.css">
<script type="text/javascript"
	src="js/lib/DataTables-1.10.10/media/js/jquery.dataTables.min.js"></script>
<link rel="stylesheet" type="text/css"
	href="js/lib/OpenLayers-4.6.4/ol.css">
<script type="text/javascript"
	src="js/lib/OpenLayers-4.6.4/ol.js"></script>
<link rel="stylesheet" type="text/css" href="css/common.css">
<style type="text/css">
.routeTool {
	display: none;
}
.routeTool-visible {
	display: unset;
}
table.dataTable tbody td {
	padding: 0px 10px !important;
}
#mapdiv, #mapdiv2 {
	min-width: 960px;
	min-height: 540px;
	height: calc(32vh - 16px);
	border: 1px solid black;
	position: relative;
}
div.list_container {
	height: 500px;
	position: relative;
	overflow-y: auto;
}
div.maps_container {
	height: calc(100vh - 516px);
	position: relative;
	overflow-y: auto;
}

</style>
<script type="text/javascript" src="js/datautils.js"></script>
<script type="text/javascript" src="js/mapview.js"></script>
<script type="text/javascript" src="js/floorplan_editor.js"></script>
<script type="text/javascript" src="js/overlay.js"></script>
<script type="text/javascript" src="js/floorplans2.js"></script>
<script type="text/javascript" src="js/cabot_mapping.js"></script>
<script type="text/javascript" src="js/util.js"></script>
<script type="text/javascript" src="js/commons.js"></script>
<script type="text/javascript" src="js/hokoukukan.js"></script>
<script>
	const DB_NAME="<%= db %>";
</script>
</head>
<body>
	<div class="list_container">
	<span style="font-weight: bold"><%=profile.getString("_id")%></span>
	<a href="floorplans.jsp?logout=true">log out</a> |
	<a href="user_password.jsp?redirect_url=cabot_mapping.jsp">change password</a> |
	<a href="../">db list</a> | 
	<span style="font-weight: bold">Manage CaBot Mapping</span> |
	<a href="map_config.jsp">Map Config</a> |
	<a href="floorplans.jsp">Manage Floor Plan</a>
	<br>

	<div id='message' style='color: red;'></div>
	<div id='progress' style='color: gray;'></div>

	<div class="floorplan_hide_edit ref_hide_edit">
		<h2 class="ui-widget-header">CaBot Mapping <%= dbname %></h2>
		<div style="margin-top: -10px; margin-bottom: 10px;">
			<div class="fileUpload btn btn-primary">
				<span>Import MapService attachments</span>
				<input type="file" id="import_attachments" webkitdirectory directory multiple
				 class="upload" onchange="importAttachments(this.files)"/>
			</div>
			<div class="fileUpload btn btn-primary">
				<span>Import Mapping Data</span>
				<input type="file" id="import_mapping_data" webkitdirectory directory multiple
				 class="upload" onchange="importMappingData(this.files)"/>
			</div>
			|
			<button id="exportMaps" onclick="exportMaps('maps.zip')">
				Export Maps (zip)
			</button>
			<button id="exportMapsYaml" onclick="exportMaps('maps.yaml')">
				Export Maps (yaml only)
			</button>
		</div>
		<div class="ui-widget-content" id="data_table"></div>
	</div>
	
	<div id="floorplan_form" class="floorplan_show_edit" style="display: none"
		title="Floor Plan">
		<form onsubmit="createFloorplan(this); return false;"
			onreset="hideFloorplanForm()">
			<input type="hidden" id="floorplan_id" name="floorplan_id" value="" />
			<p class="forCreate forEdit forImage forTile">
				<label for="name">Name:</label><br /> <input id="name" name="name"
					type="text" size="40" />
			</p>
			<p class="forCreate forEdit forImage forTile">
				<label for="comment">Comment:</label><br />
				<textarea id="comment" name="comment" cols="40" rows="5"></textarea>
			</p>
			<p class="forCreate forImage forTile">
				<input id="is_tile" name="is_tile" type="checkbox" />
				<label for="is_tile">Is this floorplan provided by tile server? </label>
			</p>
			<p class="forCreate forEdit forTile">
				<label for="tile_url">Tile URL:</label><input id="tile_url"
					name="tile_url" type="text" /><br /> 
			</p>	
			<p class="forCreate forEdit forImage">
				<input id='file' name="file" type="file" />
				<input id='filename' name='filename' type="hidden" />
			</p>
			<p class="forCreate forEdit forImage">
				<label>Type of image:<select id="type" name="type">
					<option value="floormap" selected>Floor Map</option>
					<option value="systemmap">System Map</option>
					<option value="integrated">Integrated System Map</option>
					<option value="">Others</option>
				</select></label>
			</p>
			<p class="forCreate forEdit forImage forTile forGroup">
				<label for="group">Group Name:</label><input id="group"
					name="group" type="text" />
			</p>
			<p class="forCreate forEdit forImage forTile">
				<label for="floor">Floor:</label><input id="floor"
					name="floor" type="number" />
			</p>
			<p class="forCreate forEdit forImage forGroup">
				<label for="origin_x">Origin X:</label> <input id="origin_x"
					name="origin_x" type="text" /><br /> 
				<label for="origin_y">Origin Y:</label> <input id="origin_y"
					name="origin_y" type="text" />
			</p>
			<p class="forCreate forEdit forImage forGroup">
				<label for="ppm_x">PPM X:</label><input id="ppm_x"
					name="ppm_x" type="text" /><br /> 
				<label for="ppm_y">PPM Y:</label><input id="ppm_y"
					name="ppm_y" type="text" />
			</p>			
			<p class="forCreate forEdit forImage forTile forGroup">
				<label for="lat">Anchor Latitude:</label><input id="lat"
					name="lat" type="text" /><br /> 
				<label for="lng">Anchor Longitude:</label><input id="lng"
					name="lng" type="text" /><br /> 
			</p>
			<p class="forCreate forEdit forImage forGroup">
				<label for="rotate">Anchor Rotate:</label><input id="rotate"
					name="rotate" type="text" />
			</p>
			<p class="forCreate forEdit forImage">
				<label for="z-index">z-index:</label><input id="z-index"
					name="z-index" type="text" />
			</p>
			<p class="forCreate forEdit forTile">
				<label for="coverage">Anchor Coverage:</label><input id="coverage"
					name="coverage" type="text" />
			</p>
			<p>
				<input type="submit" /> <input type="reset" value="Cancel" />
			</p>
		</form>
	</div>	
	</div>

	<div class="maps_container">
	<div class="">
		<h2 class="ui-widget-header">Anchor</h2>
		<div id="menu2">
		Latitude:<input class="number" id="latitude" step="0.000001" autocomplete="off"></input>
		Longitude:<input class="number" id="longitude" step="0.000001" autocomplete="off"></input>
		Rotate:<input class="number" id="anchor_rotate" step="0.1" min="-180" max="180" autocomplete="off"></input>
		Opacity:<input class="number" id="opacity" step="0.05" min="0" max="1" value="0.8" autocomplete="off"></input>
		<select multiple id="overlays"></select>
		<button id="save">Save</button>
		</div>
		<div id="mapdiv2"></div>
	</div>
	
	<div class="" id="floorplan_div">
		<h2 class="ui-widget-header">Floor Plan</h2>
		<div id="menu"></div>
		<div id="mapdiv"></div>
	</div>
	</div>
</body>
</html>
