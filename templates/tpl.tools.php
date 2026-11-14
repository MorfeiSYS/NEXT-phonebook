<?php include(TEMPLATES_DIR.'tpl.header.php'); ?>

<?php if(!isset($config)) { $config = array(); } ?>
<?php if(!isset($tools_has_tftpboot_admin)) { $tools_has_tftpboot_admin = FALSE; } ?>

<h3><?php L('Settings') ?></h3>

<div class="settings-hub">
	<div class="settings-card">
		<h4><?php L('Tools') ?></h4>
		<p class="settings-card-desc"><?php L('SettingsCardToolsDesc') ?></p>
		<button type="button" class="button-other" onclick="f_settings_modal_open('settings-tools-modal')"><?php L('SettingsOpen') ?></button>
	</div>
	<?php if($core->UserAuth->check_permission(0, PB_ACCESS_ADMIN)) { ?>
	<div class="settings-card">
		<h4><?php L('SettingsDefaultsTitle') ?></h4>
		<p class="settings-card-desc"><?php L('SettingsCardDefaultsDesc') ?></p>
		<button type="button" class="button-other" onclick="f_settings_modal_open('settings-defaults-modal')"><?php L('SettingsOpen') ?></button>
	</div>
	<?php if($tools_has_tftpboot_admin) { ?>
	<div class="settings-card">
		<h4><?php L('TftpBootAdmin') ?></h4>
		<p class="settings-card-desc"><?php L('SettingsCardPhoneDesc') ?></p>
		<button type="button" class="button-other" onclick="f_settings_modal_open('settings-phone-modal', true)"><?php L('SettingsOpen') ?></button>
	</div>
	<?php } ?>
	<?php } ?>
</div>

<?php if($core->UserAuth->check_permission(0, PB_ACCESS_ADMIN)) { ?>
<details class="settings-advanced">
	<summary><?php L('AdvancedSettings') ?></summary>
	<table id="table" class="main-table settings-config-table">
		<thead>
			<tr>
				<th width="1%">UID</th>
				<th width="20%"><?php L('ConfigName') ?></th>
				<th width="40%"><?php L('Value') ?></th>
				<th width="39%"><?php L('Description') ?></th>
			</tr>
		</thead>
		<tbody id="table-data">
			<?php foreach($config as &$row) { ?>
				<tr>
					<td><?php eh($row['uid']); ?></td>
					<td><span class="command" onclick="f_show_form('<?php ln('setting_get/'.$row['uid'].'/'.$row['name']) ?>');"><?php eh($row['name']); ?></span></td>
					<td><pre class="settings-config-pre"><?php eh($row['value']); ?></pre></td>
					<td><pre class="settings-config-pre"><?php eh($row['description']); ?></pre></td>
				</tr>
			<?php } ?>
		</tbody>
	</table>
</details>
<?php } ?>

<div id="settings-tools-modal" class="modal-container settings-modal" style="display: none" onclick="f_settings_modal_backdrop_close(event, 'settings-tools-modal')">
	<span class="close white" onclick="f_settings_modal_close('settings-tools-modal')">&times;</span>
	<div class="modal-content settings-modal-content" onclick="event.stopPropagation()">
		<span class="close" onclick="f_settings_modal_close('settings-tools-modal')">&times;</span>
		<h3><?php L('Tools') ?></h3>
		<div class="settings-tools-links">
			<a href="<?php ln('contacts_sync') ?>" onclick="return f_confirm_async(this);"><?php L('Sync') ?></a>
			<a href="<?php ln('contacts_hide_disabled') ?>" onclick="return f_confirm_hide_disabled_async(this);"><?php L('HideDisabledContacts') ?></a>
			<a href="<?php ln('contacts_show_all_enabled') ?>" onclick="return f_confirm_async(this);"><?php L('ShowEnabledContacts') ?></a>
			<a href="<?php ln('contacts_reveal_admin_hidden') ?>" onclick="return f_confirm_reveal_admin_hidden_async(this);"><?php L('RevealAdminHiddenContacts') ?></a>
			<a href="<?php ln('contacts_purge_deleted') ?>" onclick="return f_confirm_async(this);"><?php L('PurgeADDeletedContacts') ?></a>
			<a href="<?php ln('contacts_export') ?>"><?php L('Export') ?></a>
			<a href="<?php ln('contacts_dump_db') ?>"><?php L('DumpDB') ?></a>
			<a href="<?php ln('contacts_export_xml') ?>"><?php L('ExportXML') ?></a>
			<a href="#" onclick="f_import_xml(); return false;"><?php L('ImportXML') ?></a>
			<?php if(defined('USE_MEMCACHED') && USE_MEMCACHED) { ?>
			<a href="<?php ln('memcached_flush') ?>" onclick="return f_async(this);"><?php L('FlushMemcached') ?></a>
			<?php } ?>
			<?php if(!$core->UserAuth->is_ldap_user() && $core->UserAuth->get_id()) { ?>
			<a href="#" onclick="f_show_form('<?php ln('password_change_form') ?>'); return false;"><?php L('ChangePassword') ?></a>
			<?php } ?>
		</div>
		<p>
			<?php L('CurrentUserToken') ?>: <b><?php eh($core->UserAuth->get_token()); ?></b><br />
			<?php L('TokenNote') ?>
		</p>
		<p><?php L('UsageExample') ?>:</p>
		<pre class="settings-tools-pre">
  curl --silent --cookie <?php eh('"zl='.$core->UserAuth->get_login().';zh='.$core->UserAuth->get_token().'"'); ?> --output /dev/null "http://localhost/<?php ln('contacts_sync') ?>"
  php -f <?php eh(isset($_SERVER['SCRIPT_FILENAME']) ? $_SERVER['SCRIPT_FILENAME'] : ''); ?> -- --user <?php eh($core->UserAuth->get_login()); ?> --token <?php eh($core->UserAuth->get_token()); ?> --path contacts_sync
  php -f <?php eh(isset($_SERVER['SCRIPT_FILENAME']) ? $_SERVER['SCRIPT_FILENAME'] : ''); ?> -- --user <?php eh($core->UserAuth->get_login()); ?> --token <?php eh($core->UserAuth->get_token()); ?> --path contacts_hide_disabled
  php -f <?php eh(isset($_SERVER['SCRIPT_FILENAME']) ? $_SERVER['SCRIPT_FILENAME'] : ''); ?> -- --user <?php eh($core->UserAuth->get_login()); ?> --password &lt;password&gt; --path contacts_sync
</pre>
	</div>
</div>

<?php if($core->UserAuth->check_permission(0, PB_ACCESS_ADMIN)) { ?>
<?php $default_columns = contacts_columns_global($core); $theme_default = theme_default_value($core); ?>
<div id="settings-defaults-modal" class="modal-container settings-modal" style="display: none" onclick="f_settings_modal_backdrop_close(event, 'settings-defaults-modal')">
	<span class="close white" onclick="f_settings_modal_close('settings-defaults-modal')">&times;</span>
	<div class="modal-content settings-modal-content" onclick="event.stopPropagation()">
		<span class="close" onclick="f_settings_modal_close('settings-defaults-modal')">&times;</span>
		<h3><?php L('SettingsDefaultsTitle') ?></h3>
		<form class="columns-picker" data-required="<?php eh(LL('ColumnsRequired')); ?>" onsubmit="return f_save_directory_defaults(this);">
			<div><b><?php L('ColumnsDefault') ?></b></div>
			<?php foreach(contacts_columns_catalog() as $column_key => $column_meta) { ?>
				<label><input type="checkbox" name="col" value="<?php eh($column_key); ?>"<?php if(in_array($column_key, $default_columns, TRUE)) echo ' checked'; ?> /> <?php L($column_meta['label']); ?></label>
			<?php } ?>
			<div>
				<label><?php L('ThemeDefault') ?>
					<select name="theme_default">
						<option value="light"<?php if($theme_default === 'light') echo ' selected'; ?>><?php L('ThemeLight') ?></option>
						<option value="dark"<?php if($theme_default === 'dark') echo ' selected'; ?>><?php L('ThemeDark') ?></option>
					</select>
				</label>
			</div>
			<input class="button-other" type="submit" value="<?php L('Save') ?>" />
		</form>
	</div>
</div>

<?php if($tools_has_tftpboot_admin) { ?>
<div id="settings-phone-modal" class="modal-container settings-modal settings-phone-modal" style="display: none" onclick="f_settings_modal_backdrop_close(event, 'settings-phone-modal')">
	<span class="close white" onclick="f_settings_modal_close('settings-phone-modal')">&times;</span>
	<div class="modal-content settings-modal-content settings-phone-modal-content" onclick="event.stopPropagation()">
		<span class="close" onclick="f_settings_modal_close('settings-phone-modal')">&times;</span>
		<h3><?php L('TftpBootAdmin') ?></h3>
		<p><a href="<?php ln('tftpboot') ?>"><?php L('TftpBootTitle') ?></a></p>
		<?php $tftpboot_admin_embedded = TRUE; include(TEMPLATES_DIR.'tpl.tftpboot-admin-body.php'); ?>
	</div>
</div>
<script src="<?php ls('tftpboot.js') ?>"></script>
<?php } ?>
<?php } ?>

<?php include(TEMPLATES_DIR.'tpl.form-upload.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.universal-form.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>