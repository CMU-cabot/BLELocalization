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
	response.sendRedirect("user_login.jsp?logout=true&redirect_url=" + db + "/map_config.jsp");
	return;
}
%>
<!DOCTYPE html>
<!----------------------------------------------------------------------------
Copyright (c) 2014, 2024 IBM Corporation and Carnegie Mellon University
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
<title>CaBot Mapping - map config <%= dbname %></title>

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
<script type="text/javascript"
	src="js/lib/jsoneditor/dist/jsoneditor.js"></script>
<link rel="stylesheet" type="text/css" href="css/spectre-0.5.9/dist/spectre.min.css">
<link rel="stylesheet" type="text/css" href="css/spectre-0.5.9/dist/spectre-icons.min.css">
<link rel="stylesheet" type="text/css" href="css/common.css">
<style type="text/css">
div.form-group label, div.form-group input {
	display: inline-block;
	max-width: 50%;
	padding: 5px 8px;
}
div.form-group label {
	min-width: 12em;
	text-align: right;
}

</style>
<script type="text/javascript" src="js/datautils.js"></script>
<script type="text/javascript" src="js/cabot_mapping.js"></script>
<script type="text/javascript" src="js/map_config.js"></script>
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
	<a href="user_password.jsp?redirect_url=map_config.jsp">change password</a> |
	<a href="../">db list</a> | 
	<a href="cabot_mapping.jsp">Manage CaBot Mapping</a> |
	<span style="font-weight: bold">Map Config</span> |
	<a href="floorplans.jsp">Manage Floor Plan</a>
	<br>

	<div id='message' style='color: red;'></div>
	<div id='progress' style='color: gray;'></div>


    <h2 class="ui-widget-header">CaBot Mapping - Map Config - <%= dbname %></h2>
	<div style="margin: 10px">
		<button onclick="exportMapYaml();">
			Export Map Yaml
		</button>
	</div>
	<div class="json-editor" id='editor_holder'></div>
</body>
</html>
