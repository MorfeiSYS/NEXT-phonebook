<?php

function permissions(&$core, $params, $post_data)
{
	if(!$core->UserAuth->check_permission(0, PB_ACCESS_ADMIN))
	{
		$error_msg = LL('AccessDeniedToSection').' 0 '.LL('forUser').' '.$core->UserAuth->get_login().'!';
		include(TEMPLATES_DIR.'tpl.message.php');
		exit;
	}

	$q = (strpos(WEB_LINK_PREFIX, '?path=') !== FALSE) ? '&' : '?';
	header('Location: '.WEB_LINK_PREFIX.'users'.$q.'open=permissions');
	exit;
}