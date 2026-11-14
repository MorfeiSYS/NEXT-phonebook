<?php include(TEMPLATES_DIR.'tpl.header.php'); ?>

<h3><?php L('TftpBootAdmin') ?></h3>
<?php $tftpboot_admin_embedded = FALSE; include(TEMPLATES_DIR.'tpl.tftpboot-admin-body.php'); ?>

<script src="<?php ls('tftpboot.js') ?>"></script>
<script>tftpboot_bind_admin();</script>

<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>