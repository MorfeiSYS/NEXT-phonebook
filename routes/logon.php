<?php

function logon(&$core, $params, $post_data)
{
	if(!$core->UserAuth->logon(@$post_data['login'], @$post_data['passwd']))
	{
		$return_url = @$post_data['return'];
		$error_msg = LL('InvalidUserPasswd');
		$login_field = trim((string) @$post_data['login']);
		if($login_field !== '' && strpbrk($login_field, '\\@') === FALSE && defined('USE_LDAP') && USE_LDAP)
		{
			$error_msg = LL('LoginNeedDomainFormat');
		}
		include(TEMPLATES_DIR.'tpl.login.php');
		exit;
	}

	/*
	if(!$core->UserAuth->is_member(LDAP_ADMIN_GROUP_DN))
	{
		$core->UserAuth->logoff();
		$error_msg = 'Access denied!';
		include(TEMPLATES_DIR.'tpl.login.php');
		exit;
	}
	*/
	
	$return_url = safe_internal_redirect_url(@$post_data['return']);
	if($return_url !== '')
	{
		header('Location: '.$return_url);
	}
	else
	{
		header('Location: '.WEB_LINK_PREFIX);
	}
}
