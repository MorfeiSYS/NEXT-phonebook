<?php
if(!isset($user_id)) { $user_id = ''; }
if(!isset($reset_token)) { $reset_token = ''; }
if(!isset($error_msg)) { $error_msg = ''; }
include(TEMPLATES_DIR.'tpl.header.php'); ?>
			<div class="login-block">
				<h1><?php L('ResetPassword') ?></h1>
				<form action="<?php ln('password_reset') ?>" method="post">
					<input type="hidden" name="csrf_token" value="<?php eh(csrf_token()); ?>"/>
					<input type="hidden" name="uid" value="<?php eh($user_id); ?>"/>
					<input type="hidden" name="reset_token" value="<?php eh($reset_token); ?>"/>
					<?php L('NewPassword') ?>
					<input type="password" name="new_password" /><br />
					<?php L('NewPasswordAgain') ?>
					<input type="password" name="new_password2" /><br />
					<?php if(!empty($error_msg)) { ?>
					<p><?php eh($error_msg); ?></p>
					<?php } ?>
					<input type="submit" value="<?php L('OK') ?>" /><br />
				</form>
			</div>
<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>
