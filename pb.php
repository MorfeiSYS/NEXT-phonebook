<?php
/*
    LDAP-phonebook - simple LDAP phonebook
    Copyright (C) 2016-2021 Dmitry V. Zimin

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

define('DB_VERSION', 13);

if(!defined('ROOT_DIR'))
{
	define('ROOT_DIR', dirname(__FILE__).DIRECTORY_SEPARATOR);
	define('TEMPLATES_DIR', ROOT_DIR.'templates'.DIRECTORY_SEPARATOR);
	define('MODULES_DIR', ROOT_DIR.'modules'.DIRECTORY_SEPARATOR);
	define('ROUTES_DIR', ROOT_DIR.'routes'.DIRECTORY_SEPARATOR);
}

if(!file_exists(ROOT_DIR.'inc.config.php'))
{
	//header('Content-Type: text/plain; charset=utf-8');
	//echo 'Configuration file inc.config.php is not found!';
	header('Location: install.php');
	exit;
}

require_once(ROOT_DIR.'inc.config.php');

	// Defaults for optional config constants (inc.config.php may omit them; keeps linters satisfied)
	if(!defined('APP_LANGUAGE'))
	{
		define('APP_LANGUAGE', 'en');
	}
	if(!defined('WEB_URL'))
	{
		define('WEB_URL', 'http://localhost/');
	}
	if(!defined('WEB_LINK_BASE_PATH'))
	{
		define('WEB_LINK_BASE_PATH', '/');
	}

	session_name('ZID');
	session_start();
	error_reporting(E_ALL);
	define('Z_PROTECTED', 'YES');

	//$self = $_SERVER['PHP_SELF'];

	if(!empty($_SERVER['HTTP_CLIENT_IP'])) {
		$ip = $_SERVER['HTTP_CLIENT_IP'];
	} elseif(!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
		$ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
	} else {
		$ip = @$_SERVER['REMOTE_ADDR'];
	}

	require_once(ROOT_DIR.'modules'.DIRECTORY_SEPARATOR.'Core.php');
	// require_once(ROOT_DIR.'languages'.DIRECTORY_SEPARATOR.APP_LANGUAGE.'.php');
	require_once(ROOT_DIR.'inc.utils.php');
	require_once(ROOT_DIR.'inc.tftpboot.php');

function assert_permission_ajax($section_id, $allow_bit)
{
	global $core;

	if(!$core->UserAuth->check_permission($section_id, $allow_bit))
	{
		echo '{"code": 1, "message": "'.LL('AccessDeniedToSection').' '.$section_id.' '.LL('forUser').' '.$core->UserAuth->get_login().'!"}';
		exit;
	}
}

function user_is_admin()
{
	global $core;

	return $core->UserAuth->check_permission(0, PB_ACCESS_ADMIN);
}

function user_is_operator()
{
	global $core;

	return $core->UserAuth->check_permission(0, PB_ACCESS_OPERATOR);
}

function user_has_tftpboot()
{
	global $core;

	return user_has_tftpboot_access($core);
}

function role_label($role)
{
	$role = intval($role);

	if($role >= PB_ROLE_ADMIN)
	{
		return LL('RoleAdmin');
	}

	if($role >= PB_ROLE_OPERATOR)
	{
		return LL('RoleOperator');
	}

	return LL('RoleUser');
}

function contacts_columns_catalog()
{
	return array(
		'name' => array('sort' => 0, 'label' => 'Name', 'width' => '20%'),
		'phone' => array('sort' => 1, 'label' => 'Phone', 'width' => '10%'),
		'phone_city' => array('sort' => 2, 'label' => 'PhoneCity', 'width' => '10%'),
		'mobile' => array('sort' => 3, 'label' => 'Mobile', 'width' => '10%'),
		'mail' => array('sort' => 4, 'label' => 'Mail', 'width' => '15%'),
		'position' => array('sort' => 5, 'label' => 'Position', 'width' => '10%'),
		'department' => array('sort' => 6, 'label' => 'Department', 'width' => '10%'),
		'organization' => array('sort' => 7, 'label' => 'Organization', 'width' => '10%')
	);
}

function contacts_columns_normalize($json, $force_name = FALSE)
{
	$decoded = json_decode($json, TRUE);
	if(!is_array($decoded))
	{
		$decoded = array();
	}

	$visible = array();
	foreach(contacts_columns_catalog() as $key => $meta)
	{
		if(in_array($key, $decoded, TRUE))
		{
			$visible[] = $key;
		}
	}

	if($force_name && !in_array('name', $visible, TRUE))
	{
		array_unshift($visible, 'name');
	}

	return $visible;
}

function contacts_columns_global(&$core)
{
	$columns = contacts_columns_normalize($core->Config->get_global('contacts_columns_json', ''));
	if(!$columns)
	{
		$columns = array_keys(contacts_columns_catalog());
	}

	return $columns;
}

function contacts_columns_visible(&$core)
{
	$global = contacts_columns_global($core);
	if(!$core->UserAuth->get_id() || !$core->Config->user_has('contacts_columns_json'))
	{
		return $global;
	}

	$personal = contacts_columns_normalize($core->Config->get_user('contacts_columns_json', ''), TRUE);
	if(!$personal)
	{
		return $global;
	}

	return $personal;
}

/**
 * Human-readable tooltip for status dot (matches flag bits used in contact_name_status_dot_markup).
 */
function contact_name_status_dot_title($flags)
{
	$f = intval($flags);
	$parts = array();
	if(($f & PB_CONTACT_AD_DELETED) !== 0)
	{
		$parts[] = LL('ContactStatusTooltipAdDeleted');
	}
	if(($f & PB_CONTACT_AD_DISABLED) !== 0)
	{
		$parts[] = LL('ContactStatusTooltipAdDisabled');
	}
	if(($f & PB_CONTACT_LIST_HIDDEN) !== 0)
	{
		$parts[] = LL('ContactStatusTooltipListHidden');
	}
	if(($f & PB_CONTACT_VISIBLE) === 0)
	{
		$parts[] = LL('ContactStatusTooltipNotVisible');
	}
	if(empty($parts))
	{
		return LL('ContactStatusTooltipOk');
	}

	return implode('; ', $parts);
}

/**
 * Status dot left of the name: one color per flag; several active → conic-gradient sectors.
 * Sectors (clockwise): deleted (red), disabled (orange), list hidden (blue), hidden / not visible (purple).
 */
function contact_name_status_dot_markup($flags)
{
	$f = intval($flags);
	$title = htmlspecialchars(contact_name_status_dot_title($flags), ENT_QUOTES, 'UTF-8');
	$order = array(
		array('bit' => PB_CONTACT_AD_DELETED, 'class' => 'contact-status-dot--del', 'color' => '#c62828', 'negate' => false),
		array('bit' => PB_CONTACT_AD_DISABLED, 'class' => 'contact-status-dot--dis', 'color' => '#ef6c00', 'negate' => false),
		array('bit' => PB_CONTACT_LIST_HIDDEN, 'class' => 'contact-status-dot--hid', 'color' => '#1565c0', 'negate' => false),
		array('bit' => PB_CONTACT_VISIBLE, 'class' => 'contact-status-dot--inv', 'color' => '#6a1b9a', 'negate' => true),
	);
	$active = array();
	foreach($order as $o)
	{
		$on = $o['negate'] ? (($f & $o['bit']) === 0) : (($f & $o['bit']) !== 0);
		if($on)
		{
			$active[] = $o;
		}
	}
	$n = count($active);
	if($n === 0)
	{
		return '<span class="contact-status-dot contact-status-dot--ok" title="'.$title.'" aria-label="'.$title.'"></span>';
	}
	if($n === 1)
	{
		return '<span class="contact-status-dot '.htmlspecialchars($active[0]['class'], ENT_QUOTES, 'UTF-8').'" title="'.$title.'" aria-label="'.$title.'"></span>';
	}
	$step = 360 / $n;
	$parts = array();
	for($i = 0; $i < $n; $i++)
	{
		$parts[] = $active[$i]['color'].' '.($i * $step).'deg '.(($i + 1) * $step).'deg';
	}
	$style = 'background: conic-gradient(from 0deg, '.implode(', ', $parts).');';

	return '<span class="contact-status-dot contact-status-dot--multi" style="'.htmlspecialchars($style, ENT_QUOTES, 'UTF-8').'" title="'.$title.'" aria-label="'.$title.'"></span>';
}

function contacts_column_cell($key, &$row)
{
	switch($key)
	{
		case 'name':
			$classes = array('contact-name-cell');
			if((intval($row['flags']) & PB_CONTACT_WITH_PHOTO))
			{
				$classes[] = 'userwithphoto';
			}
			$td_class = ' class="'.htmlspecialchars(implode(' ', $classes), ENT_QUOTES, 'UTF-8').'"';
			$dot_html = contact_name_status_dot_markup($row['flags']);
			$name = htmlspecialchars($row['last_name'].' '.$row['first_name'].' '.$row['middle_name']);
			return '<td onclick="f_sw_map(event);" onmouseenter="f_sw_img(event);" onmouseleave="gi(\'imgblock\').style.display = \'none\'" onmousemove="f_mv_img(event);" style="cursor: pointer;"'.$td_class.'>'.$dot_html.'<span class="contact-name-text">'.$name.'</span></td>';

		case 'phone':
			$value = htmlspecialchars((string) $row['phone_internal']);
			return '<td><a href="tel:'.$value.'">'.$value.'</a></td>';

		case 'phone_city':
			$value = htmlspecialchars((string) $row['phone_external']);
			return '<td><a href="tel:'.$value.'">'.$value.'</a></td>';

		case 'mobile':
			$value = htmlspecialchars((string) $row['phone_mobile']);
			return '<td><a href="tel:'.$value.'">'.$value.'</a></td>';

		case 'mail':
			$value = htmlspecialchars((string) $row['mail']);
			return '<td><a href="mailto:'.$value.'">'.$value.'</a></td>';

		case 'position':
			return '<td>'.htmlspecialchars((string) $row['position']).'</td>';

		case 'department':
			return '<td>'.htmlspecialchars((string) $row['department']).'</td>';

		case 'organization':
			return '<td>'.htmlspecialchars((string) $row['organization']).'</td>';
	}

	return '';
}

/**
 * Real column names of @contacts (for XML/SQL round-trips that must match the current schema).
 *
 * @return list<string>
 */
function contacts_table_column_names(&$core)
{
	$rows = array();
	if(!$core->db->select_ex($rows, rpv('SHOW COLUMNS FROM `@contacts`')))
	{
		return array();
	}

	$names = array();
	foreach($rows as $row)
	{
		if(isset($row[0]) && $row[0] !== '')
		{
			$names[] = $row[0];
		}
	}

	return $names;
}

function theme_default_value(&$core)
{
	$theme = $core->Config->get_global('theme_default', 'light');
	if($theme !== 'dark' && $theme !== 'light')
	{
		return 'light';
	}

	return $theme;
}

function assert_admin_page(&$core)
{
	if(!$core->UserAuth->check_permission(0, PB_ACCESS_ADMIN))
	{
		$error_msg = LL('AccessDeniedToSection').' 0 '.LL('forUser').' '.$core->UserAuth->get_login().'!';
		include(TEMPLATES_DIR.'tpl.message.php');
		exit;
	}
}

function log_db_params($params, $max_len = 4096)
{
	if(!is_string($params))
	{
		$params = (string) $params;
	}

	if(strlen($params) > $max_len)
	{
		return substr($params, 0, $max_len - 3).'...';
	}

	return $params;
}

function log_db($operation, $params, $flags)
{
	global $core;

	$core->db->put(rpv('INSERT INTO @logs (`date`, `uid`, `operation`, `params`, `flags`) VALUES (NOW(), #, !, !, #)',
		$core->UserAuth->get_id(),
		$operation,
		log_db_params($params),
		$flags
	));
}

function log_file($message)
{
	if(defined('LOG_FILE'))
	{
		error_log(date('c').'  '.$message."\n", 3, LOG_FILE);
	}
}

function LL($key)
{
	global $lang;

	if(empty($lang[$key]))
	{
		return '{'.$key.'}';
	}

	return $lang[$key];
}

function L($key)
{
	eh(LL($key));
}

if (defined('USE_PRETTY_LINKS') && USE_PRETTY_LINKS
	&& (
		(defined('USE_PRETTY_LINKS_FORCE') && (USE_PRETTY_LINKS_FORCE))
		|| (function_exists('apache_get_modules') && in_array('mod_rewrite', apache_get_modules()))
	))
{
	define('PRETTY_LINKS_BASE_PATH', WEB_LINK_BASE_PATH);
	define('WEB_LINK_PREFIX', WEB_LINK_BASE_PATH);			// '/websco/'
	define('WEB_LINK_STATIC_PREFIX', WEB_LINK_BASE_PATH);
	define('WEB_LINK_EXTERNAL', WEB_URL);
}
else
{
	define('PRETTY_LINKS_BASE_PATH', '');
	define('WEB_LINK_PREFIX', basename(__FILE__).'?path=');
	define('WEB_LINK_STATIC_PREFIX', '');
	define('WEB_LINK_EXTERNAL', WEB_URL.WEB_LINK_PREFIX);
}

function ln($path)
{
	eh(WEB_LINK_PREFIX.$path);
}

function ls($path)
{
	eh(WEB_LINK_STATIC_PREFIX.$path);
}

require_once(ROOT_DIR.'inc.maps.php');

function languages_list()
{
	$files = scandir(ROOT_DIR . 'languages' . DIRECTORY_SEPARATOR);
	$themes = [];

	foreach($files as $file)
	{
		if(preg_match('/^(.+)\.php$/', $file, $matches))
		{
			$themes[] = $matches[1];
		}
	}

	return $themes;
}

function exception_handler($exception)
{
	$error_msg = 'Exception: File: '.$exception->getFile().'['.$exception->getLine().']: '.$exception->getMessage().' Trace: '.$exception->getTraceAsString();
	include(TEMPLATES_DIR.'tpl.error.php');
	log_file($error_msg);
}

function exception_handler_ajax($exception)
{
	$error_msg = 'Exception: File: '.$exception->getFile().'['.$exception->getLine().']: '.$exception->getMessage().' Trace: '.$exception->getTraceAsString();
	echo '{"code": 1, "message": "'.json_escape($error_msg).'"}';
	log_file($error_msg);
}

	$core = new Core(TRUE);
	$core->load_ex('db', 'MySQLDB');

	if(intval($core->Config->get_global('db_version', 0)) != DB_VERSION)
	{
		header('Location: '.WEB_LINK_STATIC_PREFIX.'upgrade.php');
		exit;
	}

	define('PB_ACCESS_ADMIN', 1);
	define('PB_ACCESS_OPERATOR', 2);
	define('PB_ACCESS_TFTPBOOT', 3);
	define('PB_ROLE_USER', 0);
	define('PB_ROLE_OPERATOR', 1);
	define('PB_ROLE_ADMIN', 2);
	$core->UserAuth->set_bits_representation('aot');

	$g_maps_catalog = maps_catalog_load($core);
	$g_maps_count = count($g_maps_catalog['byId']);
	$g_maps_catalog_js_urls = array();
	foreach($g_maps_catalog['byId'] as $mid => $entry)
	{
		$p = maps_catalog_image_public_path($entry);
		$g_maps_catalog_js_urls[(string) intval($mid)] = maps_catalog_is_absolute_url($p) ? $p : (WEB_LINK_STATIC_PREFIX.$p);
	}
	/** @deprecated kept for install/upgrade and any legacy references; titles only, order follows catalog ids */
	$map_names = array();
	foreach($g_maps_catalog['flat'] as $entry)
	{
		$map_names[intval($entry['id']) - 1] = $entry['title'];
	}
	ksort($map_names, SORT_NUMERIC);
	$map_names = array_values($map_names);

	$path = '';
	$data = NULL;

	if((php_sapi_name() == 'cli') && ($argc > 1) && !empty($argv[1]))
	{
		$user = '';
		$password = '';
		$token = '';
		
		$i = 1;
		while($i < ($argc-1))
		{
			switch($argv[$i])
			{
				case '--user':
					{
						$user = $argv[$i+1];
					}
					break;
				case '--password':
					{
						$password = $argv[$i+1];
					}
					break;
				case '--token':
					{
						$token = $argv[$i+1];
					}
					break;
				case '--path':
					{
						$path = $argv[$i+1];
					}
					break;
				case '--data':
					{
						parse_str($argv[$i+1], $data);
					}
					break;
				default:
					echo 'Unknown argument: '.$argv[$i]."\n";
					exit(1);
			}
			
			$i += 2;
		}
		
		if(!empty($user))
		{
			if(!empty($token))
			{
				if(!$core->UserAuth->logon_by_token($user, $token))
				{
					echo 'Invalid username or token'."\n";
					exit(1);
				}
			}
			else
			{
				if(!$core->UserAuth->logon($user, $password))
				{
					echo 'Invalid username or password'."\n";
					exit(1);
				}
			}
		}
	}
	elseif(isset($_GET['path']))
	{
		$path = &$_GET['path'];
		$data = &$_POST;
	}

	$core->Router->set_exception_handler_regular('exception_handler');
	$core->Router->set_exception_handler_ajax('exception_handler_ajax');

	define('PB_CONTACT_VISIBLE',       0x0001);
	define('PB_CONTACT_AD_DELETED',    0x0002);
	define('PB_CONTACT_AD_DISABLED',   0x0004);
	define('PB_CONTACT_WITH_PHOTO',    0x0008);
	/// Hidden from the phonebook by admin bulk action (does not affect AD sync bits)
	define('PB_CONTACT_LIST_HIDDEN',   0x0010);

	global $g_app_language;
	$g_app_language = $core->Config->get_user('language', isset($_COOKIE['lang']) ? $_COOKIE['lang'] : APP_LANGUAGE);
	if(!file_exists(ROOT_DIR.'languages'.DIRECTORY_SEPARATOR.$g_app_language.'.php'))
	{
		$g_app_language = APP_LANGUAGE;
	}

	require_once(ROOT_DIR.'languages'.DIRECTORY_SEPARATOR.$g_app_language.'.php');

	//$core->Router->add_route('info', 'info');

	$core->Router->add_route('contacts', 'contacts');						// default route
	$core->Router->add_route('contacts_search', 'contacts', TRUE);
	$core->Router->add_route('all', 'contacts');

	$core->Router->add_route('map', 'map');
	$core->Router->add_route('hello', 'hello', TRUE);
	$core->Router->add_route('contact_location_set', 'contact_location_set', TRUE);

	if(!$core->UserAuth->get_id())
	{
		$core->Router->add_route('login', 'login');
		$core->Router->add_route('logon', 'logon');
	}
	else
	{
		$core->Router->add_route('contact_get', 'contact_get', TRUE);

		$core->Router->add_route('setting_user_save', 'setting_user_save', TRUE);
		$core->Router->add_route('contacts_columns_reset', 'contacts_columns_reset', TRUE);

		$core->Router->add_route('password_change_form', 'password_change_form', TRUE);
		$core->Router->add_route('password_change', 'password_change', TRUE);

		if(user_is_operator())
		{
			$core->Router->add_route('contact_edit', 'contact_edit', TRUE);
			$core->Router->add_route('contact_save', 'contact_save', TRUE);
		}

		if(user_has_tftpboot())
		{
			$core->Router->add_route('tftpboot', 'tftpboot');
			$core->Router->add_route('tftpboot_tree', 'tftpboot_tree', TRUE);
			$core->Router->add_route('tftpboot_config_get', 'tftpboot_config_get', TRUE);
			$core->Router->add_route('tftpboot_config_save', 'tftpboot_config_save', TRUE);
			$core->Router->add_route('tftpboot_keys_search', 'tftpboot_keys_search', TRUE);
			$core->Router->add_route('tftpboot_keys_bulk_save', 'tftpboot_keys_bulk_save', TRUE);
			$core->Router->add_route('tftpboot_keys_bulk_delete', 'tftpboot_keys_bulk_delete', TRUE);
			$core->Router->add_route('tftpboot_directory', 'tftpboot_directory', TRUE);
			$core->Router->add_route('tftpboot_sync_preview', 'tftpboot_sync_preview', TRUE);
			$core->Router->add_route('tftpboot_sync_apply', 'tftpboot_sync_apply', TRUE);
			$core->Router->add_route('tftpboot_sync_undo', 'tftpboot_sync_undo', TRUE);
			$core->Router->add_route('tftpboot_rescan', 'tftpboot_rescan', TRUE);
		}

		if(user_is_admin())
		{
			$core->Router->add_route('handshakes', 'handshakes');
			$core->Router->add_route('logs', 'logs');
			$core->Router->add_route('contacts_sync', 'contacts_sync', TRUE);
			$core->Router->add_route('contacts_hide_disabled', 'contacts_hide_disabled', TRUE);
			$core->Router->add_route('contacts_show_all_enabled', 'contacts_show_all_enabled', TRUE);
			$core->Router->add_route('contacts_reveal_admin_hidden', 'contacts_reveal_admin_hidden', TRUE);
			$core->Router->add_route('contacts_purge_deleted', 'contacts_purge_deleted', TRUE);
			$core->Router->add_route('contacts_dump_db', 'contacts_dump_db', TRUE);
			$core->Router->add_route('contacts_export', 'contacts_export', TRUE);
			$core->Router->add_route('contacts_export_selected', 'contacts_export_selected', TRUE);
			$core->Router->add_route('contacts_export_xml', 'contacts_export_xml', TRUE);
			$core->Router->add_route('contacts_import_xml', 'contacts_import_xml', TRUE);
			$core->Router->add_route('contact_show', 'contact_show', TRUE);
			$core->Router->add_route('contact_hide', 'contact_hide', TRUE);
			$core->Router->add_route('contact_delete', 'contact_delete', TRUE);
			$core->Router->add_route('contact_photo_delete', 'contact_photo_delete', TRUE);
			$core->Router->add_route('contact_photo_set', 'contact_photo_set', TRUE);

			$core->Router->add_route('map_set', 'map_set', TRUE);

			$core->Router->add_route('tools', 'tools');

			$core->Router->add_route('setting_get', 'setting_get', TRUE);
			$core->Router->add_route('setting_save', 'setting_save', TRUE);

			$core->Router->add_route('complete_account', 'complete_account', TRUE);
			$core->Router->add_route('complete_computer', 'complete_computer', TRUE);
			$core->Router->add_route('complete_mail', 'complete_mail', TRUE);
			$core->Router->add_route('complete_group', 'complete_group', TRUE);

			$core->Router->add_route('permissions', 'permissions');
			$core->Router->add_route('permissions_get', 'permissions_get', TRUE);
			$core->Router->add_route('permission_delete', 'permission_delete', TRUE);
			$core->Router->add_route('permission_get', 'permission_get', TRUE);
			$core->Router->add_route('permission_new', 'permission_new', TRUE);
			$core->Router->add_route('permission_save', 'permission_save', TRUE);

			$core->Router->add_route('users', 'users');
			$core->Router->add_route('user_get', 'user_get', TRUE);
			$core->Router->add_route('user_save', 'user_save', TRUE);
			$core->Router->add_route('user_deactivate', 'user_deactivate', TRUE);
			$core->Router->add_route('user_activate', 'user_activate', TRUE);
			$core->Router->add_route('user_password_form', 'user_password_form', TRUE);
			$core->Router->add_route('user_password', 'user_password', TRUE);

			$core->Router->add_route('register_approve_form', 'register_approve_form');
			$core->Router->add_route('register_approve', 'register_approve');

			$core->Router->add_route('memcached_flush', 'memcached_flush', TRUE);

			$core->Router->add_route('tftpboot_admin', 'tftpboot_admin');
			$core->Router->add_route('tftpboot_admin_catalog_save', 'tftpboot_admin_catalog_save', TRUE);
			$core->Router->add_route('tftpboot_admin_override_save', 'tftpboot_admin_override_save', TRUE);
			$core->Router->add_route('tftpboot_admin_policy_save', 'tftpboot_admin_policy_save', TRUE);
			$core->Router->add_route('tftpboot_catalog_add_suggested', 'tftpboot_catalog_add_suggested', TRUE);
		}

	}
	
	$core->Router->add_route('tftpboot_sync_run', 'tftpboot_sync_run', TRUE);

	$core->Router->add_route('logoff', 'logoff');

	$core->Router->add_route('language_change', 'language_change', TRUE);

	$core->Router->add_route('password_reset_send_form', 'password_reset_send_form', TRUE);
	$core->Router->add_route('password_reset_send', 'password_reset_send', TRUE);
	$core->Router->add_route('password_reset_form', 'password_reset_form');
	$core->Router->add_route('password_reset', 'password_reset');

	$core->Router->add_route('register_form', 'register_form', TRUE);
	$core->Router->add_route('register', 'register', TRUE);

	$core->Router->process($path, $data);

