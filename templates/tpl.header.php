<?php if(!defined('Z_PROTECTED')) exit; ?>
<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<title><?php L('Title') ?></title>
		<link rel="icon" type="image/png" sizes="32x32" href="<?php ls('templates/favicon-32x32.png') ?>">
		<link rel="icon" type="image/png" sizes="16x16" href="<?php ls('templates/favicon-16x16.png') ?>">
		<link type="text/css" href="<?php ls('templates/style.css') ?>" rel="stylesheet" />
		<link type="text/css" href="<?php ls('templates/flatpickr.material_red.css') ?>" rel="stylesheet" />
		<script src="<?php global $g_app_language; ls('languages/'.$g_app_language.'.js'); ?>"></script>
		<script src="<?php ls('pb.js') ?>"></script>
		<script src="<?php ls('flatpickr.min.js') ?>"></script>
		<script>
			is_admin = <?php echo (user_is_admin() ? '1' : '0'); ?>;
			is_operator = <?php echo (user_is_operator() ? '1' : '0'); ?>;
			g_link_prefix = '<?php echo WEB_LINK_PREFIX; ?>';
			g_link_static_prefix = '<?php echo WEB_LINK_STATIC_PREFIX; ?>';
			g_map_image_urls = <?php echo json_encode(isset($g_maps_catalog_js_urls) ? $g_maps_catalog_js_urls : array(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
		</script>
		<script type="text/javascript">
			document.documentElement.setAttribute("data-theme-color", localStorage.getItem("theme-color") || <?php echo json_encode(theme_default_value($core)); ?>);
		</script>
<!-- Morfei-->
<link href="/snow/snow.min.css" rel="stylesheet">
	</head>
	<body>
<!-- Morfei -->
<script src="/snow/Snow.min.js"></script>
<script>
  new Snow();
</script>
		<ul class="menu-bar">
			<li><a href="<?php ln('contacts') ?>"><?php L('Home') ?></a></li>
			<?php if(!isset($g_maps_catalog)) { global $g_maps_catalog; } ?>
			<?php $__map_menu_first = maps_catalog_first_map_id($g_maps_catalog); $__map_menu_path = ($__map_menu_first > 0) ? ('map/'.$__map_menu_first) : 'map'; ?>
			<li class="menu-item">
				<a href="<?php ln($__map_menu_path) ?>"><?php L('MapMenu') ?></a>
				<ul class="submenu maps-main-submenu submenu-left">
					<?php maps_catalog_echo_main_submenu($g_maps_catalog); ?>
				</ul>
			</li>
			<li><a href="<?php ln('all') ?>"><?php L('ShowAll') ?></a></li>
			<?php if($core->UserAuth->get_id()) { ?>
				<?php if(user_is_admin()) { ?>
				<li><a href="<?php ln('handshakes') ?>"><?php L('Handshakes') ?></a></li>
				<li class="menu-item">
					<a href="<?php ln('tools') ?>"><?php L('Tools') ?></a>
					<ul class="submenu submenu-left">
						<li><a href="<?php ln('contacts_sync') ?>" onclick="return f_confirm_async(this);"><?php L('Sync') ?></a></li>
						<li><a href="<?php ln('contacts_hide_disabled') ?>" onclick="return f_confirm_hide_disabled_async(this);"><?php L('HideDisabledContacts') ?></a></li>
						<li><a href="<?php ln('contacts_show_all_enabled') ?>" onclick="return f_confirm_async(this);"><?php L('ShowEnabledContacts') ?></a></li>
						<li><a href="<?php ln('contacts_reveal_admin_hidden') ?>" onclick="return f_confirm_reveal_admin_hidden_async(this);"><?php L('RevealAdminHiddenContacts') ?></a></li>
						<li><a href="<?php ln('contacts_purge_deleted') ?>" onclick="return f_confirm_async(this);"><?php L('PurgeADDeletedContacts') ?></a></li>
						<li><a href="<?php ln('contacts_export') ?>"><?php L('Export') ?></a></li>
						<li><a href="<?php ln('contacts_dump_db') ?>"><?php L('DumpDB') ?></a></li>
						<li><a href="<?php ln('contacts_export_xml') ?>"><?php L('ExportXML') ?></a></li>
						<li><a href="#" onclick="f_import_xml(); return false;"><?php L('ImportXML') ?></a></li>
					</ul>
				</li>
				<li><a href="<?php ln('permissions') ?>"><?php L('Permissions') ?></a></li>
				<li><a href="<?php ln('users') ?>"><?php L('Users') ?></a></li>
				<?php } ?>
			<?php } ?>

			<li class="right-menu-container">
				<ul class="right-menu">
				
					<li class="menu-item">
						<a href="#" onclick="return false;"><?php L('Theme') ?></a>
						<ul class="submenu">
							<li><a href="#" onclick="f_theme_change('dark'); return false;"><?php L('ThemeDark') ?></a></li>
							<li><a href="#" onclick="f_theme_change('light'); return false;"><?php L('ThemeLight') ?></a></li>
							<?php if($core->UserAuth->get_id()) { ?>
							<li><a href="#" onclick="f_columns_dialog(); return false;"><?php L('Columns') ?></a></li>
							<?php } ?>
						</ul>
					</li>

					<li class="menu-item">
						<a href="#" onclick="return false;"><?php L('Language') ?></a>
						<ul class="submenu">
							<?php
								$languages = languages_list();
								foreach($languages as $language)
								{
									echo '<li><a href="#" onclick="f_language_change(\'' . htmlspecialchars($language) . '\'); return false;">' . htmlspecialchars(strtoupper($language)) . '</a></li>';
								}
							?>
						</ul>
					</li>

					<?php if($core->UserAuth->get_id()) { ?>
						<li><a href="<?php ln('logoff') ?>"><?php L('Logout') ?> (<?php eh($core->UserAuth->get_login()); ?>)</a></li>
					<?php } else { ?>
						<li><a href="<?php ln('login') ?>"><?php L('LoginBtn') ?></a></li>
					<?php } ?>
				</ul>
			</li>
		</ul>
		<?php if($core->UserAuth->get_id()) { $user_columns = contacts_columns_visible($core); ?>
		<div id="columns-dialog" class="modal-container" style="display: none;">
			<span class="close white" onclick="this.parentNode.style.display='none'">&times;</span>
			<div class="modal-content">
				<span class="close" onclick="this.parentNode.parentNode.style.display='none'">&times;</span>
				<h3><?php L('Columns') ?></h3>
				<form id="contacts-columns" class="columns-dialog" onsubmit="return f_save_contacts_columns(this);">
					<?php foreach(contacts_columns_catalog() as $column_key => $column_meta) { ?>
						<label><input type="checkbox" name="col" value="<?php eh($column_key); ?>"<?php if($column_key === 'name' || in_array($column_key, $user_columns, TRUE)) echo ' checked'; ?><?php if($column_key === 'name') echo ' disabled'; ?> /> <?php L($column_meta['label']); ?></label>
					<?php } ?>
					<input class="button-accept" type="submit" value="<?php L('Save') ?>" />
					<?php if($core->Config->user_has('contacts_columns_json')) { ?>
						<button class="button-other" type="button" onclick="return f_reset_contacts_columns();"><?php L('ColumnsAsAdmin') ?></button>
					<?php } ?>
				</form>
			</div>
		</div>
		<?php } ?>
