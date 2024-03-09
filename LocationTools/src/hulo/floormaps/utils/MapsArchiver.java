/*******************************************************************************
 * Copyright (c) 2014, 2023  IBM Corporation, Carnegie Mellon University and others
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

package hulo.floormaps.utils;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.wsdl.Output;

import org.apache.wink.json4j.JSON;
import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONException;
import org.apache.wink.json4j.JSONObject;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import com.mongodb.gridfs.GridFSDBFile;

import hulo.localization.servlet.MongoService;

public class MapsArchiver {

	public static void export(String filename, HttpServletRequest request, HttpServletResponse response)
			throws JSONException, IOException {
		String db = request.getParameter("db");
		if (MongoService.getInstance(db) == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST);
			return;
		}		

		response.setHeader("Content-Disposition", String.format("attachment; filename=\"%s\"", filename));
		String mapsJsonString = request.getParameter("maps");

		OutputStream os = response.getOutputStream();
		try (ZipOutputStream zos = new ZipOutputStream(os)) {
			ObjectMapper jsonMapper = new ObjectMapper();
			JsonNode jsonNodeTree = jsonMapper.readTree(mapsJsonString);
			write(jsonNodeTree.get("maps"), zos);
			System.out.println(mapsJsonString);
			JSONObject mapsJson = (JSONObject) JSON.parse(mapsJsonString);
			JSONArray attachments = mapsJson.getJSONArray("attachment");
			for (Object obj : attachments) {
				JSONObject attachment = (JSONObject) obj;
				MongoService mDS = MongoService.getInstance(db);

				String name = attachment.getString("filename");
				String id = attachment.getString("id");
				zos.putNextEntry(new ZipEntry("maps/"+name));
				GridFSDBFile file = mDS.getFile(id);
				mDS.readFile(file, os=zos);
				zos.closeEntry();
			}
		}
	}

	public static void write(JsonNode mapsJson, ZipOutputStream zos) throws IOException {
		YAMLMapper yamlMapper = new YAMLMapper();
		zos.putNextEntry(new ZipEntry("maps/maps.yaml"));
		zos.write(yamlMapper.writeValueAsString(mapsJson).getBytes("UTF-8"));
		zos.closeEntry();
	}

}
