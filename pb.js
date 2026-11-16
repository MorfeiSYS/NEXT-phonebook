var is_admin = 0;
var is_operator = 0;
var map = 0;
var map_count = 0;
var g_map_image_urls = {};
var PB_CONTACT_VISIBLE     = 0x0001;
var PB_CONTACT_AD_DELETED  = 0x0002;
var PB_CONTACT_AD_DISABLED = 0x0004;
var PB_CONTACT_WITH_PHOTO  = 0x0008;
var PB_CONTACT_LIST_HIDDEN = 0x0010;

function gi(name)
{
	return document.getElementById(name);
}

function map_image_url(id)
{
	var key = '' + id;
	if(typeof g_map_image_urls !== 'undefined' && g_map_image_urls[key])
	{
		return g_map_image_urls[key];
	}
	return g_link_static_prefix + 'photos/map' + id + '.png';
}

function escapeHtml(text)
{
  return (''+text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

function tftpboot_moderation_update_count(n) {
	n = parseInt(n, 10);
	if (isNaN(n) || n < 0) n = 0;
	var tab = document.querySelector('.tftpboot-tab-moderation');
	if (tab) {
		var countEl = tab.querySelector('.tftpboot-moderation-tab-count');
		if (countEl) {
			countEl.textContent = n > 0 ? ' (' + n + ')' : '';
		}
		tab.classList.toggle('tftpboot-moderation-pending', n > 0);
	}
	var menu = document.getElementById('menu-tftpboot-link');
	if (menu) {
		var badge = menu.querySelector('.menu-tftpboot-badge');
		if (!badge) {
			badge = document.createElement('span');
			badge.className = 'menu-tftpboot-badge';
			menu.appendChild(document.createTextNode(' '));
			menu.appendChild(badge);
		}
		badge.textContent = n > 0 ? '(' + n + ')' : '';
		badge.style.display = n > 0 ? '' : 'none';
		menu.classList.toggle('menu-tftpboot-pending', n > 0);
	}
}

var g_tftpboot_moderation_poll_timer = null;

function tftpboot_moderation_poll_tick() {
	if (!window.g_tftpboot_can_moderate) return;
	if (typeof document.hidden !== 'undefined' && document.hidden) return;
	f_http(
		g_link_prefix + 'tftpboot_moderation_pending',
		function (res) {
			if (res && res.code === 0 && typeof res.pending_count === 'number') {
				tftpboot_moderation_update_count(res.pending_count);
			}
		},
		null,
		'application/json',
		'{}'
	);
}

function tftpboot_moderation_poll_start() {
	if (!window.g_tftpboot_can_moderate) return;
	var sec = parseInt(window.g_tftpboot_moderation_poll_sec, 10);
	if (isNaN(sec) || sec < 60) sec = 60;
	if (g_tftpboot_moderation_poll_timer) {
		clearInterval(g_tftpboot_moderation_poll_timer);
		g_tftpboot_moderation_poll_timer = null;
	}
	g_tftpboot_moderation_poll_timer = setInterval(tftpboot_moderation_poll_tick, sec * 1000);
}

function json2url(data)
{
	return Object.keys(data).map(
		function(k)
		{
			return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
		}
	).join('&');
}

function formatbytes(bytes, decimals) {
   if(bytes == 0) return '0 B';
   var k = 1024;
   var dm = decimals || 2;
   var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function f_xhr()
{
	try { return new XMLHttpRequest(); } catch(e) {}
	try { return new ActiveXObject("Msxml3.XMLHTTP"); } catch(e) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch(e) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch(e) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch(e) {}
	try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch(e) {}
	console.log("ERROR: XMLHttpRequest undefined");
	return null;
}

function f_http(url, _f_callback, _callback_params, content_type, data)
{
	var f_callback = null;
	var callback_params = null;

	if(typeof _f_callback !== 'undefined') f_callback = _f_callback;
	if(typeof _callback_params !== 'undefined') callback_params = _callback_params;
	if(typeof content_type === 'undefined') content_type = null;
	if(typeof data === 'undefined') data = null;

	var xhr = f_xhr();
	if(!xhr)
	{
		if(f_callback)
		{
			f_callback({code: 1, message: "AJAX error: XMLHttpRequest unsupported"}, callback_params);
		}

		return false;
	}

	xhr.open((content_type || data)?"post":"get", url, true);
	xhr.onreadystatechange = function()
	{
		if(xhr.readyState == 4)
		{
			var result;
			if(xhr.status == 200)
			{
				try
				{
					result = JSON.parse(xhr.responseText);
				}
				catch(e)
				{
					result = {code: 1, message: "Response: "+xhr.responseText};
				}
			}
			else
			{
				result = {code: 1, message: "AJAX error code: "+xhr.status};
			}

			if(f_callback)
			{
				f_callback(result, callback_params);
			}
		}
	};

	if(content_type)
	{
		xhr.setRequestHeader('Content-Type', content_type);
	}

	if((content_type || data) && typeof g_csrf_token !== 'undefined' && g_csrf_token)
	{
		xhr.setRequestHeader('X-CSRF-Token', g_csrf_token);
	}

	xhr.send(data);

	return true;
}

/*
form_data = {
	code = '0 - success, otherwise error',
	message = 'error message',
	title = 'form name',
	fields = [
		{
			type = 'hidden, list, date, number, string',
			name = 'post name',
			title = 'human readable caption'
			value = 'default value'
			list = [
				'select value 1',
				'list values',
				...
			]
		},
		...
	]
}
*/

function f_append_fields(el, fields, form_id, spoiler_id)
{
	//console.log('f_append_fields' + spoiler_id);
	for(var i = 0, ec = fields.length; i < ec; i++)
	{
		if(fields[i].type == 'hidden')
		{
			html = '<input name="' + escapeHtml(fields[i].name) + '" type="hidden" value="' + escapeHtml(fields[i].value) + '" />';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);
		}
		else if(fields[i].type == 'list' && fields[i].list)
		{
			html = '<div class="form-title"><label for="' + escapeHtml(form_id + fields[i].name) + '">'+ escapeHtml(fields[i].title) + ':</label></div>'
				+ '<select class="form-field" id="' + escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '">'
				+ '<option value=""></option>';
			for(j = 0; j < fields[i].list.length; j++)
			{
				selected = ''
				if(fields[i].values)
				{
					if(fields[i].values[j] == fields[i].value)
					{
						selected = ' selected="selected"'
					}
				}
				else if(fields[i].list[j] == fields[i].value)
				{
					selected = ' selected="selected"'
				}
				html += '<option value="' + escapeHtml(fields[i].values ? fields[i].values[j] : fields[i].list[j]) + '"' + selected + '>' + escapeHtml(fields[i].list[j]) + '</option>';
			}
			html += '</select>'
				+ '<div id="' + escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);
		}
		else if(fields[i].type == 'flags' && fields[i].list)
		{
			value = parseInt(fields[i].value, 10);

			html = '<div class="form-title">' + escapeHtml(fields[i].title) + ':</div>';
			for(j = 0; j < fields[i].list.length; j++)
			{
				checked = '';
				if(value & (0x01 << j))
				{
					checked = ' checked="checked"';
				}

				html += '<span><input id="' + escapeHtml(form_id + fields[i].name) + '[' + j +']" name="' + escapeHtml(fields[i].name) + '[' + j +']" type="checkbox" value="' + (fields[i].values?fields[i].values[j]:'1') + '"' + checked + '/><label for="'+ escapeHtml(form_id + fields[i].name) + '[' + j + ']">' + escapeHtml(fields[i].list[j]) + '</label></span>'
			}
			html += '<div id="' + escapeHtml(form_id + fields[i].name) + '[0]-error" class="form-error"></div>';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);
		}
		else if(fields[i].type == 'datetime')
		{
			var wrapper = document.createElement('div');
			wrapper.innerHTML = '<div class="form-title"><label for="' + escapeHtml(form_id + fields[i].name) + '">' + escapeHtml(fields[i].title) + ':</label></div>'
				+ '<input class="form-field" id="'+ escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '" type="edit" value="' + escapeHtml(fields[i].value) + '"/>'
				+ '<div id="'+ escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';
			el.appendChild(wrapper);

			flatpickr(
				gi(form_id + fields[i].name),
				{
					allowInput: true,
					enableTime: true,
					time_24hr: true,
					defaultHour: 0,
					defaultMinute: 0,
					dateFormat: "d.m.Y H:i"
				}
			);
		}
		else if(fields[i].type == 'time')
		{
			var wrapper = document.createElement('div');
			wrapper.innerHTML = '<div class="form-title"><label for="' + escapeHtml(form_id + fields[i].name) + '">' + escapeHtml(fields[i].title) + ':</label></div>'
				+ '<input class="form-field" id="'+ escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '" type="edit" value="' + escapeHtml(fields[i].value) + '"/>'
				+ '<div id="'+ escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';
			el.appendChild(wrapper);

			flatpickr(
				gi(form_id + fields[i].name),
				{
					allowInput: true,
					enableTime: true,
					noCalendar: true,
					time_24hr: true,
					defaultHour: 0,
					defaultMinute: 0,
					dateFormat: "H:i"
				}
			);
		}
		else if(fields[i].type == 'date')
		{
			var wrapper = document.createElement('div');
			wrapper.innerHTML = '<div class="form-title"><label for="' + escapeHtml(form_id + fields[i].name) + '">' + escapeHtml(fields[i].title) + ':</label></div>'
				+ '<input class="form-field" id="'+ escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '" type="edit" value="' + escapeHtml(fields[i].value) + '"/>'
				+ '<div id="'+ escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';
			el.appendChild(wrapper);

			flatpickr(
				gi(form_id + fields[i].name),
				{
					allowInput: true,
					dateFormat: "d.m.Y"
				}
			);
			/*
			var picker = new Pikaday({
				field: gi(form_id + fields[i].name),
				format: 'DD.MM.YYYY'
			});
			*/
		}
		else if(fields[i].type == 'password')
		{
			html = '<div class="form-title"><label for="'+ escapeHtml(form_id + fields[i].name) + '">' + escapeHtml(fields[i].title) + ':</label></div>'
				+ '<input class="form-field" id="' + escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '" type="password" value=""/>'
				+ '<div id="'+ escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);
		}
		else if(fields[i].type == 'readonly')
		{
			html = '<div class="form-title"><label for="'+ escapeHtml(form_id + fields[i].name) + '">' + escapeHtml(fields[i].title) + ':</label></div>'
				+ '<input class="form-field" id="' + escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '" type="text" readonly="readonly" value="'+ escapeHtml(fields[i].value) + '"/>'
				+ '<div id="'+ escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);
		}
		else if(fields[i].type == 'description')
		{
			html = '<div class="form-description">'+ escapeHtml(fields[i].value) + '</div>';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);
		}
		else if(fields[i].type == 'upload')
		{
			html = '<div class="form-title"><label for="'+ escapeHtml(form_id + fields[i].name) + '">' + escapeHtml(fields[i].title) + ':</label></div>'
				+ '<span class="form-upload" id="' + escapeHtml(form_id + fields[i].name) + '-file">&nbsp;</span> <a href="#" onclick="gi(\'' + escapeHtml(form_id + fields[i].name) + '\').click(); return false;"/>' + LL.SelectFile + '</a>'
				+ '<input id="' + escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '" type="file" accept="' + escapeHtml(fields[i].accept?fields[i].accept:'') + '" style="display: none"/>'
				+ '<div id="' + escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);

			gi(form_id + fields[i].name).onchange = function(name) {
				return function() {
					gi(name + '-file').textContent = this.files.item(0).name;
				}
			}(form_id + fields[i].name);
		}
		else if(fields[i].type == 'spoiler')
		{
			spoiler_id++;

			var wrapper = document.createElement('div');
			wrapper.setAttribute('onclick', 'f_toggle_spoiler(\'' + escapeHtml(form_id + '_spoiler_' + spoiler_id) + '\');');
			wrapper.className = 'spoiler';
			wrapper.textContent = fields[i].title;
			el.appendChild(wrapper);

			wrapper = document.createElement('div');
			wrapper.id = form_id + '_spoiler_' + spoiler_id;
			wrapper.style.display = 'none';
			el.appendChild(wrapper);

			spoiler_id = f_append_fields(wrapper, fields[i].fields, form_id, spoiler_id);
		}
		else
		{
			var placeholder = '';
			if(fields[i].placeholder)
			{
				placeholder = '" placeholder="' + fields[i].placeholder;
			}

			html = '<div class="form-title"><label for="'+ escapeHtml(form_id + fields[i].name) + '">' + escapeHtml(fields[i].title) + ':</label></div>'
				+ '<input class="form-field" id="' + escapeHtml(form_id + fields[i].name) + '" name="'+ escapeHtml(fields[i].name) + '" type="edit" value="'+ escapeHtml(fields[i].value) + placeholder + '"/>'
				+ '<div id="'+ escapeHtml(form_id + fields[i].name) + '-error" class="form-error"></div>';

			var wrapper = document.createElement('div');
			wrapper.innerHTML = html;
			el.appendChild(wrapper);
			
			if(fields[i].autocomplete)
			{
				autocomplete_create(gi(form_id + fields[i].name), fields[i].autocomplete);
			}
		}
	}

	return spoiler_id;
}

function on_received_form(data, form_id)
{
	gi('loading').style.display = 'none';
	if(data.code)
	{
		f_notify(data.message, 'error');
	}
	else
	{
		gi(form_id + '-title').innerText = data.title;

		var el = gi(form_id + '-description');
		if(data.description && (data.description.length > 0))
		{
			el.innerText = data.description;
			el.style.display = 'block';
		}
		else
		{
			el.innerText = '';
			el.style.display = 'none';
		}

		el = gi(form_id + '-fields');
		el.innerHTML = '';
		html = '';
		
		f_append_fields(el, data.fields, form_id, 0);
		
		html = '<br /><div class="f-right">'
			+ '<button class="button-accept" type="submit" onclick="return f_send_form(\'' + data.action + '\');">' + LL.OK + '</button>'
			+ '&nbsp;'
			+ '<button class="button-decline" type="button" onclick="this.parentNode.parentNode.parentNode.parentNode.parentNode.style.display=\'none\'">' + LL.Cancel + '</button>'
			+ '</div>';

		var wrapper = document.createElement('div');
		wrapper.innerHTML = html;
		el.appendChild(wrapper);

		gi(form_id +'-container').style.display='block';
	}
}

function f_show_form(url)
{
	var form_id = 'uform';
	gi('loading').style.display = 'block';
	f_http(
		url,
		on_received_form,
		form_id
	);

	return false;
}

function f_send_form(action)
{
	var form_id = 'uform';
	var form_data = {};
	var el = gi(form_id + '-fields');
	for(i = 0; i < el.elements.length; i++)
	{
		if(el.elements[i].name)
		{
			var err = gi(form_id + el.elements[i].name + '-error');
			if(err)
			{
				err.style.display = 'none';
			}

			/*
			if(el.elements[i].type == 'checkbox')
			{
				if(el.elements[i].checked)
				{
					form_data[el.elements[i].name] = el.elements[i].value;
				}
			}
			else if(el.elements[i].type == 'select-one')
			{
				if(el.elements[i].selectedIndex != -1)
				{
					form_data[el.elements[i].name] = el.elements[i].value;
				}
			}
			else
			{
				form_data[el.elements[i].name] = el.elements[i].value;
			}
			*/
		}
	}

	//alert(json2url(form_data));
	//return;

	gi('loading').style.display = 'block';
	f_http(
		g_link_prefix + action,
		function(data, form_id)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				gi(form_id+'-container').style.display='none';
				//window.location = '?action=doc&id='+data.id;
				//window.location = window.location;
				//f_update_doc(data.data);
				//f_get_perms();
				on_saved(action, data);
			}
			else if(data.errors)
			{
				for(i = 0; i < data.errors.length; i++)
				{
					var el = gi(form_id + data.errors[i].name + '-error');
					if(el)
					{
						el.textContent = data.errors[i].msg;
						el.style.display = 'block';
					}
				}
			}
		},
		form_id,
		null,                                    //'application/x-www-form-urlencoded',
		(function() {
			var fd = new FormData(gi(form_id + '-fields'));
			if(typeof g_csrf_token !== 'undefined' && g_csrf_token)
			{
				fd.append('csrf_token', g_csrf_token);
			}
			return fd;
		})()
	);

	return false;
}

function f_notify(text, type)
{
	var el;
	var temp;
	el = gi('notify-block');
	if(!el)
	{
		temp = document.getElementsByTagName('body')[0];
		el = document.createElement('div');
		el.id = 'notify-block';
		el.style.top = '0px';
		el.style.right = '0px';
		el.className = 'notifyjs-corner';
		temp.appendChild(el);
	}

	temp = document.createElement('div');
	temp.innerHTML = '<div class="notifyjs-wrapper notifyjs-hidable"><div class="notifyjs-arrow"></div><div class="notifyjs-container" style=""><div class="notifyjs-bootstrap-base notifyjs-bootstrap-'+escapeHtml(type)+'"><span data-notify-text="">'+escapeHtml(text)+'</span></div>';
	temp = el.appendChild(temp.firstChild);

	setTimeout(
		(function(el)
		{
			return function() {
				el.parentNode.removeChild(el);
			};
		})(temp),
		5000
	);
}

function f_msg(text)
{
	gi('message-text').innerText = text;
	gi('message-box').style.display = 'block';
	return false;
}

function on_saved(action, data)
{
	if(action == 'permission_save')
	{
		//f_get_perms(data.pid);
		window.location = window.location;
	}
	else if(action == 'user_save' || action == 'user_ldap_save')
	{
		var row;

		if(data && data.user)
		{
			if(data.user.is_new)
			{
				try
				{
					sessionStorage.setItem('users_reopen_modal', 'users-local-modal');
				}
				catch(e)
				{
				}
				window.location = window.location;
				return;
			}
			row = f_users_row_apply_data(data.user);
			f_users_panel_refresh_row(row);
		}
	}
	else if(action == 'contact_save')
	{
		//window.location = window.location;
		f_update_row(data.id);
	}
	else if(action == 'register')
	{
		f_msg(data.message);
	}
}

function f_sw_img(ev)
{
	var el_src = ev.target || ev.srcElement;
	var row = contact_row_from_event_target(el_src);
	if(!row)
	{
		return;
	}
	var img = row.getAttribute('data-flags');
	if(parseInt(img, 10) & 0x0008)
	{
		var el = gi('userphoto');
		el.src = 'photos/t'+row.getAttribute('data-id')+'.jpg';
		el = gi('imgblock');
		el.style.display = 'block';
		el.style.left = (ev.clientX+10)  + "px";
		el.style.top = (ev.clientY+10)  + "px";
	}
}

function f_mv_img(ev)
{
	var el = gi('imgblock');
	if(el)
	{
		el.style.left = (ev.clientX+10)  + "px";
		el.style.top = (ev.clientY+10)  + "px";
	}
}

function f_sw_map(ev)
{
	var el_src = ev.target || ev.srcElement;
	var row = contact_row_from_event_target(el_src);
	if(!row)
	{
		return;
	}
	var id = parseInt(row.getAttribute('data-map'), 10);
	if(id)
	{
		var el = gi('map-container');
		var x = parseInt(row.getAttribute('data-x'), 10);
		var y = parseInt(row.getAttribute('data-y'), 10);
		el.style.display = 'block';
		el.onclick = function() {gi('map-container').style.display = 'none';};
		var mapImg = gi('map-image');
		mapImg.src = '';
		mapImg.onload = function(x, y)
		{
			return function(ev)
			{
				var el = gi('map-marker');
				var el_src = gi('map-image');
				if(el)
				{
					el.onclick = null;
					el.style.display = 'block';
					el.style.left = (el_src.offsetLeft + x - el.width/2)  + "px";
					el.style.top = (el_src.offsetTop + y - el.height/2)  + "px";
					//alert("    x: "+(el_src.offsetLeft + x) +"    y: "+(el_src.offsetTop + y));
				}
			}
		}(x, y);
		mapImg.src = map_image_url(id);
	}
}

function f_set_location(id, map, x, y)
{
	if(!is_operator)
	{
		return;
	}
	//alert("map: "+map+"    x: "+x+"    y: "+y);
	f_http(
		g_link_prefix + 'contact_location_set',
		function(data, params)
		{
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				var row = gi('row'+data.id);
				if(row)
				{
					row.setAttribute("data-map", data.map);
					row.setAttribute("data-x", data.x);
					row.setAttribute("data-y", data.y);
				}
			}
		},
		null,
		'application/x-www-form-urlencoded',
		json2url({'id' : id, 'map': map, 'x': x, 'y': y })
	);
}

function f_map_set(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	var mapId = el_src.getAttribute('data-map');
	gi('map-container').onclick = null;
	gi('map-image').onload = null;
	gi('map-image').src = map_image_url(mapId);
	gi('map-container').style.display='block';
	gi('map-marker').style.display='none';
	gi('map-image').onclick = function(event)
	{
		gi('map-marker').style.display='block';
		gi('map-marker').style.left = (event.clientX - gi('map-marker').width/2)  + "px";
		gi('map-marker').style.top = (event.clientY - gi('map-marker').height/2)  + "px";
		gi('map-marker').onclick = function()
		{
			f_set_location(id, mapId, (gi('map-marker').offsetLeft + gi('map-marker').width/2) - gi('map-image').offsetLeft, (gi('map-marker').offsetTop + gi('map-marker').height/2) - gi('map-image').offsetTop);
			gi('map-container').style.display='none';
			gi('map-image').onclick = null;
		};
	};
};

function f_map_unset(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_set_location(id, 0, 0, 0);
}

function f_hide(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_http(
		g_link_prefix + 'contact_hide',
		function(data, el)
		{
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				el.textContent = 'Show';
				el.onclick = function(event) { f_show(event); };
			}
		},
		el_src,
		'application/x-www-form-urlencoded',
		json2url({'id': id })
	);
};

function f_hide2(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_http(
		g_link_prefix + 'contact_hide',
		function(data, el)
		{
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				gi('menu-cmd-hide').style.display = 'none';
				gi('menu-cmd-show').style.display = 'block';
			}
		},
		el_src,
		'application/x-www-form-urlencoded',
		json2url({'id': id })
	);
};

function f_show(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_http(
		g_link_prefix + 'contact_show',
		function(data, el)
		{
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				el.textContent = 'Hide';
				el.onclick = function(event) { f_hide(event); };
			}
		},
		el_src,
		'application/x-www-form-urlencoded',
		json2url({'id': id })
	);
};

function f_show2(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_http(
		g_link_prefix + 'contact_show',
		function(data, el)
		{
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				gi('menu-cmd-hide').style.display = 'block';
				gi('menu-cmd-show').style.display = 'none';
			}
		},
		el_src,
		'application/x-www-form-urlencoded',
		json2url({'id': id })
	);
};

function f_get_acs_location(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_http(
		g_link_prefix + 'get_acs_location/' + id,
		function(data, el)
		{
			if(!data.code)
			{
				var temp_str = 'unknown status';
				switch(data.location)
				{
					case 1:
						temp_str = 'In office';
						break;
					case 2:
						temp_str = 'Out office';
						break;
				}
				f_notify(temp_str, data.location?"success":"error");
			}
			else
			{
				f_notify(data.message, "error");
			}
		},
		el_src
	);
};

function f_delete(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_http(
		g_link_prefix + 'contact_delete',
		function(data, id)
		{
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				var row = gi('row' + id);
				row.parentNode.removeChild(row);
				gi('contact-menu').style.display = 'none';
			}
		},
		id,
		'application/x-www-form-urlencoded',
		json2url({'id': id })
	);
};

function f_delete_photo(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_http(
		g_link_prefix + 'contact_photo_delete',
		function(data, el)
		{
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				gi('contact-menu').style.display = 'none';
				//var row = el.parentNode.parentNode;
				//row.parentNode.removeChild(row);
			}
		},
		el_src,
		'application/x-www-form-urlencoded',
		json2url({'id': id })
	);
};

function f_users_find_row(id)
{
	return document.querySelector('.users-data-row[data-id="' + String(id) + '"]');
}

function f_users_row_blocked(row, blocked)
{
	var badge;
	var ops;
	var toggle;

	if(!row)
	{
		return;
	}
	blocked = !!blocked;
	row.classList.toggle('users-row-disabled', blocked);
	row.setAttribute('data-sort-status', blocked ? '1' : '0');
	badge = row.querySelector('.users-status-badge');
	if(badge)
	{
		badge.textContent = blocked ? (LL.UserStatusBlocked || '') : (LL.UserStatusActive || '');
		badge.className = 'users-status-badge users-status-' + (blocked ? 'blocked' : 'active');
	}
	ops = row.querySelector('.users-ops-group');
	if(!ops)
	{
		return;
	}
	toggle = ops.querySelector('.users-toggle-state');
	if(!toggle)
	{
		return;
	}
	if(blocked)
	{
		toggle.textContent = LL.Activate || 'Activate';
		toggle.className = 'command users-toggle-state';
		toggle.setAttribute('onclick', 'f_activate_user(event);');
	}
	else
	{
		toggle.textContent = LL.Deactivate || 'Deactivate';
		toggle.className = 'command users-toggle-state users-ops-warn';
		toggle.setAttribute('onclick', 'f_deactivate_user(event);');
	}
	row.setAttribute('data-search', (row.getAttribute('data-sort-id') || '') + ' '
		+ (row.getAttribute('data-sort-login') || '') + ' '
		+ (row.getAttribute('data-sort-mail') || '') + ' '
		+ (row.querySelector('td:nth-child(4)') ? row.querySelector('td:nth-child(4)').textContent.toLowerCase() : ''));
}

function f_users_row_apply_data(data)
{
	var row = f_users_find_row(data.id);

	if(!row || !data)
	{
		return null;
	}
	if(data.login != null)
	{
		row.setAttribute('data-sort-login', String(data.login).toLowerCase());
		var loginCell = row.querySelector('.users-cell-login');
		if(loginCell)
		{
			loginCell.textContent = data.login;
		}
	}
	if(data.mail != null)
	{
		row.setAttribute('data-sort-mail', String(data.mail).toLowerCase());
		var mailCell = row.querySelector('.users-cell-mail');
		if(mailCell)
		{
			mailCell.textContent = data.mail;
		}
	}
	if(data.role != null)
	{
		row.setAttribute('data-sort-role', String(data.role));
		var roleCell = row.querySelector('td:nth-child(4)');
		if(roleCell && data.role_label)
		{
			roleCell.textContent = data.role_label;
		}
	}
	if(data.blocked != null)
	{
		f_users_row_blocked(row, !!data.blocked);
	}
	return row;
}

function f_users_panel_refresh_row(row)
{
	var panel;

	if(!row)
	{
		return;
	}
	panel = row.closest('.users-list-panel');
	if(panel && panel._usersListTable)
	{
		panel._usersListTable.refresh();
	}
}

function f_users_reopen_modal_after_reload()
{
	var modalId;

	try
	{
		modalId = sessionStorage.getItem('users_reopen_modal');
		if(modalId)
		{
			sessionStorage.removeItem('users_reopen_modal');
			f_users_modal_open(modalId);
		}
	}
	catch(e)
	{
	}
}

function on_action_success(el, action, data)
{
	var row;

	if(action == 'user_deactivate' || action == 'user_activate')
	{
		row = f_row_from_element(el);
		if(!row && data && data.id)
		{
			row = f_users_find_row(data.id);
		}
		if(row)
		{
			f_users_row_blocked(row, action == 'user_deactivate' || !!data.blocked);
			f_users_panel_refresh_row(row);
		}
		return;
	}

	row = f_row_from_element(el);
	if(row && row.parentNode)
	{
		row.parentNode.removeChild(row);
	}
}

function f_row_from_element(el)
{
	var node = el;

	while(node && node !== document && node !== document.body)
	{
		if(node.getAttribute && node.getAttribute('data-id'))
		{
			return node;
		}
		node = node.parentNode;
	}

	return null;
}

function f_call_action(ev, action)
{
	gi('loading').style.display = 'block';
	var el_src = ev.target || ev.srcElement;
	var row = f_row_from_element(el_src);
	var id = row ? row.getAttribute('data-id') : '';
	f_http(
		g_link_prefix + action,
		function(data, params)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				on_action_success(params.el, params.action, data);
			}
		},
		{el: el_src, action: action},
		'application/x-www-form-urlencoded',
		json2url({id: id})
	);
}

function f_delete_perm(ev)
{
	if(window.confirm(LL.ConfirmDelete))
	{
		f_call_action(ev, 'permission_delete');
	}

	return false;
}

function f_deactivate_user(ev)
{
	f_call_action(ev, 'user_deactivate');
}

function f_delete_user(ev)
{
	if(window.confirm(LL.ConfirmDelete))
	{
		f_call_action(ev, 'user_delete');
	}
}

function f_activate_user(ev)
{
	f_call_action(ev, 'user_activate');
}

function f_confirm_async(a)
{
	if(window.confirm(LL.ConfirmOperation))
	{
		return f_async_ex(a.href);
	}

	return false;
}

var g_confirm_dialog_callback = null;

function f_confirm_dialog_init()
{
	var box = gi('confirm-dialog');
	if(!box || box.getAttribute('data-inited'))
	{
		return;
	}
	box.setAttribute('data-inited', '1');
	gi('confirm-dialog-ok').onclick = function()
	{
		box.style.display = 'none';
		var cb = g_confirm_dialog_callback;
		g_confirm_dialog_callback = null;
		if(cb)
		{
			cb(true);
		}
	};
	gi('confirm-dialog-cancel').onclick = function()
	{
		box.style.display = 'none';
		var cb = g_confirm_dialog_callback;
		g_confirm_dialog_callback = null;
		if(cb)
		{
			cb(false);
		}
	};
}

function f_confirm_dialog_show(html, callback)
{
	f_confirm_dialog_init();
	g_confirm_dialog_callback = callback;
	gi('confirm-dialog-body').innerHTML = html;
	gi('confirm-dialog').style.display = 'block';
	return false;
}

function f_confirm_hide_disabled_async(a)
{
	var step1 = '<p>' + escapeHtml(LL.ConfirmHideDisabledContacts1) + '</p>'
		+ '<p class="confirm-dialog-warning">' + escapeHtml(LL.ConfirmHideDisabledMapWarning) + '</p>';
	f_confirm_dialog_show(step1, function(ok1)
	{
		if(!ok1)
		{
			return;
		}
		var step2 = '<p>' + escapeHtml(LL.ConfirmHideDisabledSuggestExport) + '</p>'
			+ '<p>' + escapeHtml(LL.ConfirmHideDisabledContacts2) + '</p>';
		f_confirm_dialog_show(step2, function(ok2)
		{
			if(ok2)
			{
				f_async_ex(a.href);
			}
		});
	});
	return false;
}

function f_confirm_reveal_admin_hidden_async(a)
{
	if(!window.confirm(LL.ConfirmRevealAdminHiddenContacts))
	{
		return false;
	}
	return f_async_ex(a.href);
}

function f_async(a)
{
	return f_async_ex(a.href);
}

function f_async_ex(url)
{
	gi('loading').style.display = 'block';
	f_http(
		url,
		function(data, el)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code?"error":"success");
			f_msg(data.message);
		},
		null
	);

	return false;
}

function f_theme_change(theme)
{
	document.documentElement.setAttribute('data-theme-color', theme);
	localStorage.setItem('theme-color', theme);
	return false;
}

function f_language_change(theme)
{
	gi('loading').style.display = 'block';
	f_http(
		g_link_prefix + 'language_change',
		function(data, el)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				window.location = window.location;
			}
		},
		null,
		'application/x-www-form-urlencoded',
		json2url({key: 'language', value: theme})
	);

	return false;
}

function f_search(f)
{
    //f.action = f.action + '/' + encodeURIComponent(gi('search').value);
    //f.submit();

	window.location = f.action + '/' + encodeURIComponent(gi('search').value);

	return false;
}

function contacts_column_on(key)
{
	var i;

	if(typeof g_contacts_columns === 'undefined' || !g_contacts_columns)
	{
		return true;
	}

	for(i = 0; i < g_contacts_columns.length; i++)
	{
		if(g_contacts_columns[i] === key)
		{
			return true;
		}
	}

	return false;
}

/** Nearest table row with contact data-* (name cell may contain nested spans). */
function contact_row_from_event_target(el)
{
	while(el && el.nodeType === 1)
	{
		if(el.tagName === 'TR' && el.getAttribute('data-id') !== null)
		{
			return el;
		}
		el = el.parentNode;
	}
	return null;
}

var CONTACT_DOT_ORDER = [
	{ bit: PB_CONTACT_AD_DELETED, singleClass: 'contact-status-dot--del', color: '#c62828' },
	{ bit: PB_CONTACT_AD_DISABLED, singleClass: 'contact-status-dot--dis', color: '#ef6c00' },
	{ bit: PB_CONTACT_LIST_HIDDEN, singleClass: 'contact-status-dot--hid', color: '#1565c0' },
	{ bit: PB_CONTACT_VISIBLE, singleClass: 'contact-status-dot--inv', color: '#6a1b9a', negate: true }
];

function attr_escape(s)
{
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function contact_status_dot_title(flags)
{
	var f = flags | 0;
	var parts = [];
	if(LL.ContactStatusTooltipAdDeleted && (f & PB_CONTACT_AD_DELETED))
	{
		parts.push(LL.ContactStatusTooltipAdDeleted);
	}
	if(LL.ContactStatusTooltipAdDisabled && (f & PB_CONTACT_AD_DISABLED))
	{
		parts.push(LL.ContactStatusTooltipAdDisabled);
	}
	if(LL.ContactStatusTooltipListHidden && (f & PB_CONTACT_LIST_HIDDEN))
	{
		parts.push(LL.ContactStatusTooltipListHidden);
	}
	if(LL.ContactStatusTooltipNotVisible && (f & PB_CONTACT_VISIBLE) === 0)
	{
		parts.push(LL.ContactStatusTooltipNotVisible);
	}
	if(parts.length === 0 && LL.ContactStatusTooltipOk)
	{
		return LL.ContactStatusTooltipOk;
	}
	return parts.join('; ');
}

function contact_status_dot_span(flags)
{
	var f = flags | 0;
	var i, n, active, step, parts, style;
	var title = attr_escape(contact_status_dot_title(f));

	active = [];
	for(i = 0; i < CONTACT_DOT_ORDER.length; i++)
	{
		var o = CONTACT_DOT_ORDER[i];
		var on = o.negate ? ((f & o.bit) === 0) : ((f & o.bit) !== 0);
		if(on)
		{
			active.push(o);
		}
	}

	if(active.length === 0)
	{
		return '<span class="contact-status-dot contact-status-dot--ok pb-hint" data-pb-hint="' + title + '" aria-label="' + title + '"></span>';
	}

	if(active.length === 1)
	{
		return '<span class="contact-status-dot ' + active[0].singleClass + ' pb-hint" data-pb-hint="' + title + '" aria-label="' + title + '"></span>';
	}

	n = active.length;
	step = 360 / n;
	parts = [];
	for(i = 0; i < n; i++)
	{
		parts.push(active[i].color + ' ' + (i * step) + 'deg ' + ((i + 1) * step) + 'deg');
	}
	style = 'background: conic-gradient(from 0deg, ' + parts.join(', ') + ');';

	return '<span class="contact-status-dot contact-status-dot--multi pb-hint" style="' + style + '" data-pb-hint="' + title + '" aria-label="' + title + '"></span>';
}

function contact_cells_html(c)
{
	var html = '';
	var value = '';

	if(is_admin)
	{
		html += '<td><input type="checkbox" name="check" value="' + escapeHtml(c.id) + '"/></td>';
	}

	if(contacts_column_on('name'))
	{
		html += '<td onclick="f_sw_map(event);" onmouseenter="f_sw_img(event);" onmouseleave="gi(\'imgblock\').style.display = \'none\'" onmousemove="f_mv_img(event);" style="cursor: pointer;" class="contact-name-cell' + ((c.flags & PB_CONTACT_WITH_PHOTO) ? ' userwithphoto' : '') + '">' + contact_status_dot_span(c.flags) + '<span class="contact-name-text">' + escapeHtml((c.last_name || '') + ' ' + (c.first_name || '') + ' ' + (c.middle_name || '')) + '</span></td>';
	}

	if(contacts_column_on('phone'))
	{
		value = escapeHtml(c.phone_internal || '');
		html += '<td><a href="tel:' + value + '">' + value + '</a></td>';
	}

	if(contacts_column_on('phone_city'))
	{
		value = escapeHtml(c.phone_external || '');
		html += '<td><a href="tel:' + value + '">' + value + '</a></td>';
	}

	if(contacts_column_on('mobile'))
	{
		value = escapeHtml(c.phone_mobile || '');
		html += '<td><a href="tel:' + value + '">' + value + '</a></td>';
	}

	if(contacts_column_on('mail'))
	{
		value = escapeHtml(c.mail || '');
		html += '<td><a href="mailto:' + value + '">' + value + '</a></td>';
	}

	if(contacts_column_on('position'))
	{
		html += '<td>' + escapeHtml(c.position || '') + '</td>';
	}

	if(contacts_column_on('department'))
	{
		html += '<td>' + escapeHtml(c.department || '') + '</td>';
	}

	if(contacts_column_on('organization'))
	{
		html += '<td>' + escapeHtml(c.organization || '') + '</td>';
	}

	if(is_admin)
	{
		html += '<td><span class="command" onclick="f_menu(event);">' + LL.Menu + '</span></td>';
	}

	return html;
}

function f_collect_columns(form)
{
	var inputs = form.querySelectorAll('input[name="col"]:checked');
	var cols = [];
	var i;

	for(i = 0; i < inputs.length; i++)
	{
		cols.push(inputs[i].value);
	}

	return cols;
}

function f_columns_dialog()
{
	gi('columns-dialog').style.display = 'block';
	return false;
}

var g_settings_phone_admin_bound = false;

function f_settings_modal_close(id)
{
	var el = gi(id);
	if(el)
	{
		el.style.display = 'none';
	}
}

function f_settings_modal_open(id, bindPhoneAdmin)
{
	var el = gi(id);
	if(!el)
	{
		return false;
	}
	el.style.display = 'block';
	if(bindPhoneAdmin && !g_settings_phone_admin_bound)
	{
		if(typeof tftpboot_bind_admin === 'function')
		{
			tftpboot_bind_admin();
			g_settings_phone_admin_bound = true;
		}
	}
	return false;
}

function f_settings_modal_backdrop_close(ev, id)
{
	if(ev.target && ev.target.id === id)
	{
		f_settings_modal_close(id);
	}
}

var g_users_list_page_size = 25;

function f_users_list_format(template, a, b, c)
{
	if(!template)
	{
		return '';
	}
	return template.replace('%1', a).replace('%2', b).replace('%3', c);
}

function UsersListTable(panel)
{
	this.panel = panel;
	this.tbody = panel.querySelector('tbody');
	this.rows = this.tbody ? Array.prototype.slice.call(this.tbody.querySelectorAll('.users-data-row')) : [];
	this.searchInput = panel.querySelector('.users-list-search');
	this.metaEl = panel.querySelector('.users-list-meta');
	this.pagerLabel = panel.querySelector('.users-pager-label');
	this.prevBtn = panel.querySelector('.users-pager-prev');
	this.nextBtn = panel.querySelector('.users-pager-next');
	this.sortCol = 'id';
	this.sortDir = 1;
	this.page = 0;
	this._bound = false;
}

UsersListTable.prototype._filtered = function()
{
	var q = (this.searchInput.value || '').trim().toLowerCase();
	var i;
	var out = [];

	for(i = 0; i < this.rows.length; i++)
	{
		if(!q || (this.rows[i].getAttribute('data-search') || '').indexOf(q) >= 0)
		{
			out.push(this.rows[i]);
		}
	}

	return out;
};

UsersListTable.prototype._compare = function(a, b)
{
	var va = a.getAttribute('data-sort-' + this.sortCol) || '';
	var vb = b.getAttribute('data-sort-' + this.sortCol) || '';
	var dir = this.sortDir;

	if(this.sortCol === 'id' || this.sortCol === 'role' || this.sortCol === 'status')
	{
		va = parseInt(va, 10) || 0;
		vb = parseInt(vb, 10) || 0;
		return dir * (va - vb);
	}

	va = va.toLowerCase();
	vb = vb.toLowerCase();
	if(va < vb)
	{
		return -dir;
	}
	if(va > vb)
	{
		return dir;
	}
	return 0;
};

UsersListTable.prototype._update_sort_headers = function()
{
	var headers = this.panel.querySelectorAll('.users-sort-th');
	var i;
	var th;

	for(i = 0; i < headers.length; i++)
	{
		th = headers[i];
		if(th.getAttribute('data-sort') === this.sortCol)
		{
			th.classList.add('users-sort-th-active');
			th.setAttribute('aria-sort', this.sortDir > 0 ? 'ascending' : 'descending');
			th.setAttribute('data-sort-dir', this.sortDir > 0 ? 'asc' : 'desc');
		}
		else
		{
			th.classList.remove('users-sort-th-active');
			th.setAttribute('aria-sort', 'none');
			th.removeAttribute('data-sort-dir');
		}
	}
};

UsersListTable.prototype.refresh = function()
{
	var filtered = this._filtered();
	var sorted = filtered.slice();
	var i;
	var start;
	var end;
	var pages;
	var total = sorted.length;
	var pageSet = {};
	var tr;

	sorted.sort(this._compare.bind(this));

	for(i = 0; i < sorted.length; i++)
	{
		this.tbody.appendChild(sorted[i]);
	}

	pages = Math.max(1, Math.ceil(total / g_users_list_page_size));
	if(this.page >= pages)
	{
		this.page = pages - 1;
	}
	if(this.page < 0)
	{
		this.page = 0;
	}

	start = this.page * g_users_list_page_size;
	end = Math.min(start + g_users_list_page_size, total);

	for(i = start; i < end; i++)
	{
		pageSet[sorted[i].getAttribute('data-id')] = true;
	}

	for(i = 0; i < this.rows.length; i++)
	{
		tr = this.rows[i];
		if(filtered.indexOf(tr) < 0)
		{
			tr.style.display = 'none';
		}
		else
		{
			tr.style.display = pageSet[tr.getAttribute('data-id')] ? '' : 'none';
		}
	}

	if(this.metaEl)
	{
		if(total === 0)
		{
			this.metaEl.textContent = LL.UsersNoMatch || '';
		}
		else
		{
			this.metaEl.textContent = f_users_list_format(LL.UsersListRange, String(start + 1), String(end), String(total));
		}
	}

	if(this.pagerLabel)
	{
		this.pagerLabel.textContent = f_users_list_format(LL.UsersListPage, String(this.page + 1), String(pages), '');
	}

	if(this.prevBtn)
	{
		this.prevBtn.disabled = (this.page <= 0);
	}
	if(this.nextBtn)
	{
		this.nextBtn.disabled = (this.page >= pages - 1);
	}

	this._update_sort_headers();
};

UsersListTable.prototype.bind = function()
{
	var self = this;
	var headers;
	var i;
	var th;

	if(this._bound || !this.tbody)
	{
		return;
	}
	this._bound = true;

	if(this.searchInput)
	{
		this.searchInput.addEventListener('input', function()
		{
			self.page = 0;
			self.refresh();
		});
	}

	headers = this.panel.querySelectorAll('.users-sort-th');
	for(i = 0; i < headers.length; i++)
	{
		th = headers[i];
		th.addEventListener('click', function(ev)
		{
			var col = ev.currentTarget.getAttribute('data-sort');
			if(col === self.sortCol)
			{
				self.sortDir = -self.sortDir;
			}
			else
			{
				self.sortCol = col;
				self.sortDir = (col === 'id' || col === 'role') ? 1 : 1;
			}
			self.page = 0;
			self.refresh();
		});
		th.addEventListener('keydown', function(ev)
		{
			if(ev.key === 'Enter' || ev.key === ' ')
			{
				ev.preventDefault();
				th.click();
			}
		});
	}

	if(this.prevBtn)
	{
		this.prevBtn.addEventListener('click', function()
		{
			if(self.page > 0)
			{
				self.page--;
				self.refresh();
			}
		});
	}
	if(this.nextBtn)
	{
		this.nextBtn.addEventListener('click', function()
		{
			self.page++;
			self.refresh();
		});
	}
};

function f_users_list_init_all()
{
	var panels = document.querySelectorAll('.users-list-panel');
	var i;

	for(i = 0; i < panels.length; i++)
	{
		if(!panels[i]._usersListTable)
		{
			panels[i]._usersListTable = new UsersListTable(panels[i]);
			panels[i]._usersListTable.bind();
		}
		panels[i]._usersListTable.refresh();
	}
}

function f_users_modal_fit(modalId)
{
	var modal = gi(modalId);
	var content;
	var panel;
	var wrap;
	var room;

	if(!modal)
	{
		return;
	}
	content = modal.querySelector('.users-modal-content');
	if(!content)
	{
		return;
	}
	content.style.maxHeight = 'min(90vh, calc(100dvh - 32px))';
	panel = modal.querySelector('.users-list-panel');
	wrap = panel ? panel.querySelector('.users-list-table-wrap') : null;
	if(!wrap)
	{
		return;
	}
	room = Math.max(200, Math.floor(window.innerHeight * 0.9) - 220);
	wrap.style.maxHeight = room + 'px';
}

function f_users_modal_open(id)
{
	var el;
	var r = f_settings_modal_open(id, false);
	f_users_list_init_all();
	f_users_modal_fit(id);
	el = gi(id);
	if(el)
	{
		var search = el.querySelector('.users-list-search');
		if(search)
		{
			try { search.focus(); } catch(e) {}
		}
	}
	return r;
}

function f_users_bootstrap()
{
	f_users_list_init_all();
	f_users_reopen_modal_after_reload();
}

if(document.readyState === 'loading')
{
	document.addEventListener('DOMContentLoaded', f_users_bootstrap);
}
else
{
	f_users_bootstrap();
}

(function()
{
	document.addEventListener('keydown', function(ev)
	{
		if(ev.key !== 'Escape')
		{
			return;
		}
		var modals = document.querySelectorAll('.settings-modal');
		var i;
		for(i = 0; i < modals.length; i++)
		{
			if(modals[i].style.display === 'block')
			{
				f_settings_modal_close(modals[i].id);
				ev.preventDefault();
				break;
			}
		}
	});
})();

function f_save_contacts_columns(form)
{
	var cols = f_collect_columns(form);

	if(cols.indexOf('name') === -1)
	{
		cols.unshift('name');
	}

	if(!cols.length)
	{
		f_notify(form.getAttribute('data-required'), 'error');
		return false;
	}

	gi('loading').style.display = 'block';
	f_http(
		g_link_prefix + 'setting_user_save',
		function(data)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code ? 'error' : 'success');
			if(!data.code)
			{
				window.location.reload();
			}
		},
		null,
		'application/x-www-form-urlencoded',
		json2url({key: 'contacts_columns_json', value: JSON.stringify(cols)})
	);

	return false;
}

function f_reset_contacts_columns()
{
	gi('loading').style.display = 'block';
	f_http(
		g_link_prefix + 'contacts_columns_reset',
		function(data)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code ? 'error' : 'success');
			if(!data.code)
			{
				window.location.reload();
			}
		}
	);

	return false;
}

function f_save_directory_defaults(form)
{
	var cols = f_collect_columns(form);
	var theme;

	if(!cols.length)
	{
		f_notify(form.getAttribute('data-required'), 'error');
		return false;
	}

	theme = form.theme_default.value;
	gi('loading').style.display = 'block';
	f_http(
		g_link_prefix + 'setting_save',
		function(data)
		{
			if(data.code)
			{
				gi('loading').style.display = 'none';
				f_notify(data.message, 'error');
				return;
			}

			f_http(
				g_link_prefix + 'setting_save',
				function(data2)
				{
					gi('loading').style.display = 'none';
					f_notify(data2.message, data2.code ? 'error' : 'success');
					if(!data2.code)
					{
						window.location.reload();
					}
				},
				null,
				'application/x-www-form-urlencoded',
				json2url({uid: 0, key: 'theme_default', value: theme})
			);
		},
		null,
		'application/x-www-form-urlencoded',
		json2url({uid: 0, key: 'contacts_columns_json', value: JSON.stringify(cols)})
	);

	return false;
}

function f_update_row(id)
{
	f_http(
		g_link_prefix + 'contact_get/' + id,
		function(data, params)
		{
			if(data.code)
			{
				f_notify(data.message, "error");
			}
			else
			{
				var row = gi('row'+data.data.id);
				if(!row)
				{
					row = gi("table-data").insertRow(0);
				}

				row.id = 'row'+data.data.id;
				row.setAttribute("data-id", data.data.id);
				row.setAttribute("data-map", data.data.map);
				row.setAttribute("data-x", data.data.x);
				row.setAttribute("data-y", data.data.y);
				row.setAttribute("data-flags", data.data.flags);
				row.innerHTML = contact_cells_html(data.data);
				if(typeof pb_hint_init === 'function')
				{
					pb_hint_init(row);
				}
			}
		}
	);
}

function f_edit(ev)
{
	var el_src = ev.target || ev.srcElement;
	var id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	f_show_form(g_link_prefix + 'contact_edit/' + id);
}

function f_upload_photo(id)
{
	gi('loading').style.display = 'block';
	var fd = new FormData(gi("form-file-upload"));
	fd.append('id', id);
	f_http(
		g_link_prefix + 'contact_photo_set',
		function(data, params)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				f_update_row(data.id);
			}
		},
		null,
		null,
		fd
	);

	return false;
}

function f_upload_file(action)
{
	gi('loading').style.display = 'block';
	var fd = new FormData(gi("form-file-upload"));
	f_http(
		g_link_prefix + action,
		function(data, params)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code?"error":"success");
		},
		null,
		null,
		fd
	);

	return false;
}

function f_photo(ev)
{
	var id = 0;
	if(ev)
	{
		var el_src = ev.target || ev.srcElement;
		id = el_src.parentNode.parentNode.parentNode.getAttribute('data-id');
	}
	if(id)
	{
		gi('file-upload').onchange = function(id) {
			return function() {
				f_upload_photo(id);
			}
		}(id);
		gi('file-upload').click();
	}
}

function f_upload_map(id)
{
	var mapId = parseInt(id, 10);
	if(!mapId)
	{
		f_notify('Invalid map identifier', 'error');
		return false;
	}
	gi('loading').style.display = 'block';
	var fd = new FormData(gi("form-file-upload"));
	fd.append('id', mapId);
	f_http(
		g_link_prefix + 'map_set',
		function(data, params)
		{
			gi('loading').style.display = 'none';
			f_notify(data.message, data.code?"error":"success");
			if(!data.code)
			{
				window.location = window.location;
			}
		},
		null,
		null,
		fd
	);

	return false;
}

function f_map_image(id)
{
	var mapId = parseInt(id, 10);
	if(!mapId)
	{
		f_notify('Invalid map identifier', 'error');
		return false;
	}
	gi('file-upload').onchange = function(id) {
		return function() {
			f_upload_map(id);
		}
	}(mapId);
	gi('file-upload').click();
}

var parentElement;

documentClick = function (event) {
	var parent;
	var wrapperElement = gi('contact-menu');
	if (event.target !== parentElement && event.target !== wrapperElement) {
		parent = event.target.parentNode;
		  while (parent !== wrapperElement && parent !== parentElement) {
			  parent = parent.parentNode;
			  if (parent === null) {
				wrapperElement.style.display = 'none';
				//wrapperElement.parentNode.removeChild(wrapperElement);
				document.removeEventListener('click', documentClick, false);
				wrapperElement = null;
				  break;
			  }
		}
	}
};

function f_menu(ev)
{
	var id = 0;
	var el_src;
	if(ev)
	{
		el_src = ev.target || ev.srcElement;
		id = el_src.parentNode.parentNode.getAttribute('data-id');
		f_menu_id(ev, el_src, id);
	}
}

function f_menu_id(ev, el_src, id)
{
	if(id)
	{
		if(!is_admin && !is_operator)
		{
			return false;
		}

		var el = gi('contact-menu');
		var pX = ev.pageX || (ev.clientX + (document.documentElement && document.documentElement.scrollLeft || document.body && document.body.scrollLeft || 0) - (document.documentElement.clientLeft || 0));
		var pY = ev.pageY || (ev.clientY + (document.documentElement && document.documentElement.scrollTop || document.body && document.body.scrollTop || 0) - (document.documentElement.clientTop || 0));
		pX = Math.round(pX-190);
		pY = Math.round(pY+5);
		if(pX < 0) pX = 0;
		if(pY < 0) pY = 0;
		el.style.left = pX  + "px";
		el.style.top = pY + "px";
		el.setAttribute('data-id', id);
		gi('menu-cmd-edit').style.display = 'none';
		gi('menu-cmd-photo').style.display = 'none';
		gi('menu-cmd-delete').style.display = 'none';
		gi('menu-cmd-delete-photo').style.display = 'none';
		gi('menu-cmd-show').style.display = 'none';
		gi('menu-cmd-hide').style.display = 'none';
		gi('menu-cmd-connect-0').style.display = 'none';
		gi('menu-cmd-connect-1').style.display = 'none';
		gi('menu-cmd-connect-2').style.display = 'none';
		gi('menu-loading').style.display = 'none';

		var mapLinks = el.querySelectorAll('li a[data-map]');
		for(var m = 0; m < mapLinks.length; m++)
		{
			mapLinks[m].parentNode.style.display = is_operator ? '' : 'none';
		}
		var unsetLink = el.querySelector('a[onclick*="f_map_unset"]');
		if(unsetLink)
		{
			unsetLink.parentNode.style.display = is_operator ? '' : 'none';
		}

		el.style.display = 'block';
		parentElement = el_src;
		document.addEventListener('click', documentClick, false);

		if(!is_admin)
		{
			return false;
		}

		gi('menu-loading').style.display = 'block';
		
		f_http(
			g_link_prefix + 'contact_get/' + id,
			function(data, el)
			{
				gi('menu-loading').style.display = 'none';
				// add pc to list
				if(data.code)
				{
					f_notify(data.message, "error");
				}
				else
				{
					if(is_admin && data.data.adid == '')
					{
						gi('menu-cmd-edit').style.display = 'block';
						gi('menu-cmd-delete').style.display = 'block';
						if(data.data.flags & 0x0008)
						{
							gi('menu-cmd-delete-photo').style.display = 'block';
						}
						else
						{
							gi('menu-cmd-photo').style.display = 'block';
						}
					}
					if(is_admin)
					{
						if(data.data.flags & 0x0001)
						{
							gi('menu-cmd-hide').style.display = 'block';
						}
						else
						{
							gi('menu-cmd-show').style.display = 'block';
						}
					}
					var i;
					for(i = 0; i < 3; i++)
					{
						if(is_admin && data.computers[i] != '')
						{
							gi('menu-cmd-connect-'+i).href = 'msraurl:' + data.computers[i];
							gi('menu-cmd-connect-'+i).style.display = 'block';
							gi('menu-cmd-connect-'+i).textContent = 'Connect to ' + data.computers[i];
						}
					}
				}
			},
			el_src
		);
	}
}

function f_import_xml()
{
	gi('file-upload').onchange = function() {
		return function() {
			f_upload_file('contacts_import_xml');
		}
	}();
	gi('file-upload').click();
}

function f_select_all(ev)
{
	var el_src = ev.target || ev.srcElement;
	checkboxes = document.getElementsByName('check');
	for(var i = 0, n = checkboxes.length; i < n; i++)
	{
		checkboxes[i].checked = el_src.checked;
	}
}

function f_export_selected(ev)
{
	var el;
	var postdata = "";
	var j = 0;
	var checkboxes = document.getElementsByName('check');
	for(var i = 0, n = checkboxes.length; i < n;i++)
	{
		if(checkboxes[i].checked)
		{
			if(j > 0)
			{
				postdata += ",";
			}
			postdata += checkboxes[i].value;
			j++;
		}
	}

	if(j > 0)
	{
		el = gi('list');
		el.value = postdata;
		el = gi('contacts');
		el.submit();
	}

	return false;
}

function f_hide_selected(ev)
{
	var postdata = "list=";
	var j = 0;
	var checkboxes = document.getElementsByName('check');
	for(var i = 0, n = checkboxes.length; i < n;i++)
	{
		if(checkboxes[i].checked)
		{
			if(j > 0)
			{
				postdata += ",";
			}
			postdata += checkboxes[i].value;
			j++;
		}
	}
	if(j > 0)
	{
		f_http(
			g_link_prefix + 'contacts_hide_selected',
			function(data, params)
			{
				f_notify(data.message, data.code?"error":"success");
			},
			null,
			'application/x-www-form-urlencoded',
			postdata
		);
	}
	else
	{
		f_popup("Error", "No selection");
	}
	return false;
}

function si(ev)
{
	var el_src = ev.target || ev.srcElement;
	var pX = ev.pageX || (ev.clientX + (document.documentElement && document.documentElement.scrollLeft || document.body && document.body.scrollLeft || 0) - (document.documentElement.clientLeft || 0));
	var pY = ev.pageY || (ev.clientY + (document.documentElement && document.documentElement.scrollTop || document.body && document.body.scrollTop || 0) - (document.documentElement.clientTop || 0));
	document.getElementById('popup').style.display = 'block';
	document.getElementById('popup').style.left = (pX+10)  + "px";
	document.getElementById('popup').style.top = (pY+10)  + "px";
	if(parseInt(el_src.getAttribute('data-flags'), 10) & 0x0008)
	{
		document.getElementById('u_photo').src = g_link_static_prefix + 'photos/t'+el_src.getAttribute('data-id')+'.jpg';
	}
	else
	{
		document.getElementById('u_photo').src = g_link_static_prefix + 'templates/nophoto.png';
	}
	document.getElementById('u_name').innerHTML = escapeHtml(el_src.getAttribute('data-name'));
	document.getElementById('u_position').innerHTML = escapeHtml(el_src.getAttribute('data-position'));
	document.getElementById('u_phone').innerHTML = escapeHtml(el_src.getAttribute('data-phone'));
}

function mi(ev)
{
	var el = document.getElementById('popup');
	if(el)
	{
		var pX = ev.pageX || (ev.clientX + (document.documentElement && document.documentElement.scrollLeft || document.body && document.body.scrollLeft || 0) - (document.documentElement.clientLeft || 0));
		var pY = ev.pageY || (ev.clientY + (document.documentElement && document.documentElement.scrollTop || document.body && document.body.scrollTop || 0) - (document.documentElement.clientTop || 0));
		el.style.left = (pX+10)  + "px";
		el.style.top = (pY+10)  + "px";
	}
}

/* old function click-click-move
function f_click(ev)
{
	el_src.style.border="1px dashed red";
	el_src.style.borderRadius = "5px";
	var el = document.getElementById('map-image');
	el.onclick = function(id) {
		return function(event)
		{
			var box = document.getElementById('map-image').getBoundingClientRect()
			//alert('px: '+event.pageX+'  py: '+event.pageY+'   cx: '+(box.left)+'  py: '+(box.top));
			f_set_location(id, <?php eh($id);?>, event.pageX - box.left - window.scrollX, event.pageY - box.top - window.scrollY);
			document.getElementById('u'+id).style.border="0px dashed black";
			document.getElementById('u'+id).style.left = (event.pageX - box.left - window.scrollX - 16)+'px';
			document.getElementById('u'+id).style.top = (event.pageY - box.top - window.scrollY - 22)+'px';
			document.getElementById('map-image').onclick = null;
		}
	}(el_src.getAttribute('data-id'));
}
*/

function f_drag(ev)
{
	if(!is_operator)
	{
		return false;
	}
	var el_src = ev.target || ev.srcElement;
	if(ev.button > 1)
	{
		f_menu_id(ev, el_src, el_src.getAttribute('data-id'));
		return false;
	}
	el_src.style.border="1px dashed red";
	el_src.style.borderRadius = "5px";

	var box = document.getElementById('map-image-drag').getBoundingClientRect();
	var sx = (window.pageXOffset !== undefined)? window.pageXOffset: (document.documentElement || document.body.parentNode || document.body).scrollLeft;
	var sy = (window.pageYOffset !== undefined)? window.pageYOffset: (document.documentElement || document.body.parentNode || document.body).scrollTop;
	var pX = ev.pageX || (ev.clientX + (document.documentElement && document.documentElement.scrollLeft || document.body && document.body.scrollLeft || 0) - (document.documentElement.clientLeft || 0));
	var pY = ev.pageY || (ev.clientY + (document.documentElement && document.documentElement.scrollTop || document.body && document.body.scrollTop || 0) - (document.documentElement.clientTop || 0));
	el_src.style.left = Math.round(pX - box.left - sx - 17)+'px';
	el_src.style.top = Math.round(pY - box.top - sy - 23)+'px';

	document.onmousemove = function(id)
	{
		return function(ev)
		{
			var box = document.getElementById('map-image-drag').getBoundingClientRect();
			var sx = (window.pageXOffset !== undefined)? window.pageXOffset: (document.documentElement || document.body.parentNode || document.body).scrollLeft;
			var sy = (window.pageYOffset !== undefined)? window.pageYOffset: (document.documentElement || document.body.parentNode || document.body).scrollTop;
			var pX = ev.pageX || (ev.clientX + (document.documentElement && document.documentElement.scrollLeft || document.body && document.body.scrollLeft || 0) - (document.documentElement.clientLeft || 0));
			var pY = ev.pageY || (ev.clientY + (document.documentElement && document.documentElement.scrollTop || document.body && document.body.scrollTop || 0) - (document.documentElement.clientTop || 0));
			var x = Math.round(pX - box.left - sx);
			var y = Math.round(pY - box.top - sy);
			if(x < 0) x = 0;
			if(y < 0) y = 0;
			if(x > box.right - box.left) x = box.right - box.left;
			if(y > box.bottom - box.top) y = box.bottom - box.top;
			//console.log("onmousemove "+id+"    sx "+sy+"     sY "+window.scrollY);
			document.getElementById('u'+id).style.left = (x - 17)+'px';
			document.getElementById('u'+id).style.top = (y - 23)+'px';
		}
	}(el_src.getAttribute('data-id'));

	el_src.onmouseup = function(ev) { f_drop(ev) };
}

function f_drop(ev)
{
	if(!is_operator)
	{
		return false;
	}
	var el_src = ev.target || ev.srcElement;
	document.onmousemove = null;
	var box = document.getElementById('map-image-drag').getBoundingClientRect();
	//alert('px: '+ev.pageX+'  py: '+ev.pageY+'   cx: '+(box.left)+'  py: '+(box.top));
	var sx = (window.pageXOffset !== undefined)? window.pageXOffset: (document.documentElement || document.body.parentNode || document.body).scrollLeft;
	var sy = (window.pageYOffset !== undefined)? window.pageYOffset: (document.documentElement || document.body.parentNode || document.body).scrollTop;
	var pX = ev.pageX || (ev.clientX + (document.documentElement && document.documentElement.scrollLeft || document.body && document.body.scrollLeft || 0) - (document.documentElement.clientLeft || 0));
	var pY = ev.pageY || (ev.clientY + (document.documentElement && document.documentElement.scrollTop || document.body && document.body.scrollTop || 0) - (document.documentElement.clientTop || 0));
	var x = Math.round(pX - box.left - sx);
	var y = Math.round(pY - box.top - sy);
	if(x < 0) x = 0;
	if(y < 0) y = 0;
	if(x > box.right - box.left) x = box.right - box.left;
	if(y > box.bottom - box.top) y = box.bottom - box.top;
	el_src.style.left = (x - 16)+'px';
	el_src.style.top = (y - 22)+'px';
	f_set_location(el_src.getAttribute('data-id'), map, x, y);
	el_src.style.border="0px dashed black";
	el_src.onmouseup = null;
}

function filter_table() {
  // Declare variables
  var input, filter, table, tr, td, i;
  input = gi("search");
  filter = input.value.toLowerCase();
  table = gi("table-data");
  tr = table.getElementsByTagName("tr");

  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    tds = tr[i].getElementsByTagName("td");
	var sh = "none";
	var j;
	for(j = 0; j < tds.length; j++)
	{
		if(tds[j])
		{
		  var str = tds[j].textContent || tds[j].innerHTML;
		  if(str.toLowerCase().indexOf(filter) > -1)
		  {
			sh = "";
			break;
		  }
		}
	}
	tr[i].style.display = sh;
  }
}

function fill_contacts(action, query, offset, total, contacts)
{
	var table_data = gi('table-data');
	var pages = gi('pages');
	var i;
	
	html = '';
	
	for(i = 0, j = contacts.length; i < j; i++)
	{
		html += '<tr id="row' + contacts[i].id +'" data-id="' + contacts[i].id +'" data-map="' + contacts[i].map +'" data-x="' + contacts[i].x +'" data-y="' + contacts[i].y +'" data-flags="' + contacts[i].flags + '">'
				+ contact_cells_html(contacts[i])
				+ '</tr>';
	}
	
	table_data.innerHTML = html;
	if(typeof pb_hint_init === 'function')
	{
		pb_hint_init(table_data);
	}

	var max = Math.min(offset + 1000, total - (total % 100));

	html = '<a class="page-number boldtext" href="' + g_link_prefix + action + '/offset/0/search/' + query + '">1</a>';

	for(i = 100; i <= max; i += 100)
	{
		html += '<a class="page-number" href="' + g_link_prefix + action + '/offset/' + i + '/search/' + query + '">' + (i/100 + 1) + '</a>';
	}

	max = total - (total % 100);

	if(i < max)
	{
		html += '&nbsp;...&nbsp;<a class="page-number" href="' + g_link_prefix + action + '/offset/' + max + '/search/' + query + '">' + (max/100 + 1) + '</a>';
	}

	pages.innerHTML = html;
}

function contacts_search(action)
{
  var search = gi("search").value.toLowerCase();
  f_http(
		g_link_prefix + action + '/json/1/search/' + search,
		function(data, params)
		{
			if(!data.code)
			{
				fill_contacts(params.action, params.query, data.offset, data.total, data.data);
			}
		},
		{query: search, action: action},
		'application/x-www-form-urlencoded',
		null
	);
}

function autocomplete_on_click(id, value)
{
	gi(id).value = value;
	autocomplete_destroy();
}

function autocomplete_on_input(ev)
{
	var el = ev.target || ev.srcElement;

	if(!el.value )
	{
		return false;
	}

	action = el.getAttribute('data-action');

	f_http(
		g_link_prefix + action,
		function(data, el)
		{
			gi('loading').style.display = 'none';
			if(data.code)
			{
				f_notify(data.message, 'error');
			}
			else
			{
				var a, b, i;
				autocomplete_current_focus = -1;

				autocomplete_destroy(null);
				a = document.createElement('DIV');
				a.setAttribute('id', 'autocomplete-container');
				a.setAttribute('class', 'autocomplete-items pb-popup-list');

				el.parentNode.appendChild(a);
				for(i = 0; i < data.list.length; i++)
				{
					b = document.createElement('DIV');
					(function(item, inputId) {
						b.textContent = item;
						b.addEventListener('click', function() {
							autocomplete_on_click(inputId, item);
						});
					})(String(data.list[i]), el.id);
					a.appendChild(b);
				}
			}
		},
		el,
		'application/x-www-form-urlencoded',
		json2url({search: el.value})
	);
}

function autocomplete_on_keydown(e)
{
	var el = e.target || e.srcElement;
	var x = gi('autocomplete-container');
	if(!x)
	{
		return;
	}

	items = x.getElementsByTagName('div');

	if(e.keyCode == 40)
	{
		autocomplete_current_focus++;
		autocomplete_add_active(items);
	}
	else if(e.keyCode == 38) //up
	{
		autocomplete_current_focus--;
		autocomplete_add_active(items);
	}
	else if (e.keyCode == 13)
	{
		e.preventDefault();
		if (autocomplete_current_focus > -1)
		{
			if(items)
			{
				items[autocomplete_current_focus].click();
			}
		}
	}
}

function autocomplete_create(input, action)
{
	input.setAttribute('data-action', action);
	//input.setAttribute('autocomplete', 'off');
	input.addEventListener('input', autocomplete_on_input);
	input.addEventListener('keydown', autocomplete_on_keydown);
}

function autocomplete_add_active(items)
{
	if(!items) return false;

	autocomplete_remove_active(items);

	if(autocomplete_current_focus >= items.length)
	{
		autocomplete_current_focus = 0;
	}

	if(autocomplete_current_focus < 0)
	{
		autocomplete_current_focus = (items.length - 1);
	}

	items[autocomplete_current_focus].classList.add('autocomplete-active');
}

function autocomplete_remove_active(items)
{
	for(var i = 0; i < items.length; i++)
	{
		items[i].classList.remove('autocomplete-active');
	}
}

var g_pb_hint_el = null;
var g_pb_hint_hide_timer = null;
var g_pb_hint_show_timer = null;
var g_pb_hint_anchor = null;

function pb_hint_delay_ms()
{
	var n = parseInt(window.g_pb_hint_delay_ms, 10);
	if(isNaN(n) || n < 0)
	{
		return 400;
	}
	if(n > 5000)
	{
		return 5000;
	}
	return n;
}

function pb_hint_ensure()
{
	if(g_pb_hint_el)
	{
		return g_pb_hint_el;
	}
	g_pb_hint_el = document.createElement('div');
	g_pb_hint_el.id = 'pb-hint-popup';
	g_pb_hint_el.className = 'pb-hint-popup';
	g_pb_hint_el.setAttribute('role', 'tooltip');
	g_pb_hint_el.style.display = 'none';
	document.body.appendChild(g_pb_hint_el);
	return g_pb_hint_el;
}

function pb_hint_hide()
{
	if(g_pb_hint_el)
	{
		g_pb_hint_el.style.display = 'none';
	}
	g_pb_hint_anchor = null;
}

function pb_hint_position(anchor, box)
{
	var r = anchor.getBoundingClientRect();
	var pad = 10;
	var gap = 8;
	var boxRect = box.getBoundingClientRect();
	var w = boxRect.width || 280;
	var h = boxRect.height || 40;
	var left = r.left + (r.width / 2);
	var top = r.bottom + gap;
	var placeAbove = (top + h + pad > window.innerHeight) && (r.top - gap - h > pad);
	box.classList.toggle('pb-hint-above', placeAbove);
	box.classList.toggle('pb-hint-below', !placeAbove);
	if(placeAbove)
	{
		top = r.top - gap - h;
	}
	if(left - w / 2 < pad)
	{
		left = pad + w / 2;
	}
	if(left + w / 2 > window.innerWidth - pad)
	{
		left = window.innerWidth - pad - w / 2;
	}
	box.style.left = left + 'px';
	box.style.top = top + 'px';
	box.style.transform = 'translateX(-50%)';
	var arrowX = Math.max(14, Math.min(w - 14, (r.left + r.width / 2) - (left - w / 2)));
	box.style.setProperty('--pb-hint-arrow-x', arrowX + 'px');
}

function pb_hint_show(anchor)
{
	var text = anchor.getAttribute('data-pb-hint');
	if(!text)
	{
		return;
	}
	var box = pb_hint_ensure();
	box.textContent = text;
	box.style.display = 'block';
	g_pb_hint_anchor = anchor;
	pb_hint_position(anchor, box);
	window.requestAnimationFrame(function() {
		if(g_pb_hint_anchor === anchor)
		{
			pb_hint_position(anchor, box);
		}
	});
	var onScroll = function() {
		if(g_pb_hint_anchor === anchor)
		{
			pb_hint_hide();
		}
		window.removeEventListener('scroll', onScroll, true);
	};
	window.addEventListener('scroll', onScroll, true);
}

function pb_hint_bind(el)
{
	if(!el || el.getAttribute('data-pb-hint-bound') === '1')
	{
		return;
	}
	var text = el.getAttribute('data-pb-hint');
	if(!text && el.getAttribute('data-tooltip'))
	{
		text = el.getAttribute('data-tooltip');
		el.setAttribute('data-pb-hint', text);
	}
	if(!text && el.getAttribute('title'))
	{
		text = el.getAttribute('title');
		el.setAttribute('data-pb-hint', text);
		el.removeAttribute('title');
	}
	if(!text)
	{
		return;
	}
	el.setAttribute('data-pb-hint-bound', '1');
	el.classList.add('pb-hint-source');
	el.addEventListener('mouseenter', function() {
		clearTimeout(g_pb_hint_hide_timer);
		clearTimeout(g_pb_hint_show_timer);
		g_pb_hint_show_timer = setTimeout(function() {
			pb_hint_show(el);
		}, pb_hint_delay_ms());
	});
	el.addEventListener('mouseleave', function() {
		clearTimeout(g_pb_hint_show_timer);
		g_pb_hint_hide_timer = setTimeout(pb_hint_hide, 60);
	});
	el.addEventListener('focus', function() {
		clearTimeout(g_pb_hint_hide_timer);
		clearTimeout(g_pb_hint_show_timer);
		g_pb_hint_show_timer = setTimeout(function() {
			pb_hint_show(el);
		}, pb_hint_delay_ms());
	});
	el.addEventListener('blur', pb_hint_hide);
}

function pb_hint_init(root)
{
	var scope = root || document;
	if(!scope.querySelectorAll)
	{
		return;
	}
	scope.querySelectorAll('[data-pb-hint], .pb-hint, .tooltip-icon').forEach(pb_hint_bind);
	scope.querySelectorAll('[title]:not([data-pb-hint-bound])').forEach(pb_hint_bind);
}

function autocomplete_destroy(e)
{
	var el = gi('autocomplete-container');
	if(el)
	{
		el.parentNode.removeChild(el);
	}
}

// https://github.com/jfriend00/docReady
// https://github.com/dmilisic/docReady
(function() {
    "use strict";
    var readyFired = false;

    // call this when the document is ready
    // this function protects itself against being called more than once
    function docReady() {
        if (!readyFired) {
            // this must be set to true before we start calling callbacks
            readyFired = true;
            tftpboot_moderation_poll_start();
            pb_hint_init(document);

			/*execute a function when someone clicks in the document:*/
        	if(document.addEventListener)
        	{
				document.addEventListener('click', 	autocomplete_destroy);
			}
			else
			{
            	document.attachEvent('onclick', autocomplete_destroy);
			}
        }
    }

    function readyStateChange() {
        if ( document.readyState === "complete" ) {
            docReady();
        }
    }

    // if document already ready to go, schedule the docReady function to run
    // IE only safe when readyState is "complete", others safe when readyState is "interactive"
    if (document.readyState === "complete" || (!document.attachEvent && document.readyState === "interactive")) {
        setTimeout(docReady, 1);
    } else {
        // otherwise install event handlers
        if (document.addEventListener) {
            // first choice is DOMContentLoaded event
            document.addEventListener("DOMContentLoaded", docReady, false);
            // backup is window load event
            window.addEventListener("load", docReady, false);
        } else {
            // must be IE
            document.attachEvent("onreadystatechange", readyStateChange);
            window.attachEvent("onload", docReady);
        }
    }
})();
