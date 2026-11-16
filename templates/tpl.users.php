<?php include(TEMPLATES_DIR.'tpl.header.php'); ?>

<div class="content-box">
	<h3><?php L('UsersManagement') ?></h3>

	<div class="settings-hub">
		<div class="settings-card">
			<h4><?php L('LocalUsers') ?></h4>
			<p class="settings-card-desc"><?php L('LocalUsersCardDesc') ?></p>
			<button type="button" class="button-other" onclick="f_users_modal_open('users-local-modal')"><?php L('SettingsOpen') ?></button>
		</div>
		<div class="settings-card">
			<h4><?php L('DomainUsers') ?></h4>
			<p class="settings-card-desc"><?php L('DomainUsersCardDesc') ?></p>
			<button type="button" class="button-other" onclick="f_users_modal_open('users-domain-modal')"><?php L('SettingsOpen') ?></button>
		</div>
	</div>
</div>
<br />

<div id="users-local-modal" class="modal-container settings-modal users-modal" style="display: none" onclick="f_settings_modal_backdrop_close(event, 'users-local-modal')">
	<span class="close white" onclick="f_settings_modal_close('users-local-modal')">&times;</span>
	<div class="modal-content settings-modal-content users-modal-content" onclick="event.stopPropagation()">
		<span class="close" onclick="f_settings_modal_close('users-local-modal')">&times;</span>
		<h3><?php L('LocalUsers') ?></h3>
		<?php
			$panel_kind = 'local';
			$panel_users = isset($local_users) ? $local_users : array();
			$show_add = TRUE;
			include(TEMPLATES_DIR.'inc.users-list-panel.php');
		?>
	</div>
</div>

<div id="users-domain-modal" class="modal-container settings-modal users-modal" style="display: none" onclick="f_settings_modal_backdrop_close(event, 'users-domain-modal')">
	<span class="close white" onclick="f_settings_modal_close('users-domain-modal')">&times;</span>
	<div class="modal-content settings-modal-content users-modal-content" onclick="event.stopPropagation()">
		<span class="close" onclick="f_settings_modal_close('users-domain-modal')">&times;</span>
		<h3><?php L('DomainUsers') ?></h3>
		<?php
			$panel_kind = 'domain';
			$panel_users = isset($domain_users) ? $domain_users : array();
			$show_add = FALSE;
			include(TEMPLATES_DIR.'inc.users-list-panel.php');
		?>
	</div>
</div>

<?php include(TEMPLATES_DIR.'tpl.universal-form.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>