<?php

function contact_edit(&$core, $params, $post_data)
{
	global $g_icons;

	$g_icons_values = array();
	
	for($i = 0; $i < count($g_icons); $i++)
	{
		array_push($g_icons_values, $i);
	}
	
	$contact_id = intval(@$params[1]);

	if($contact_id)
	{
		assert_permission_ajax(0, PB_ACCESS_ADMIN);
	}
	else
	{
		contact_assert_can_add($core);
	}

	$compname = array('', '', '');
	$contact = array();

	if($contact_id)
	{
		if(!$core->db->select_assoc_ex($contact, rpv('
			SELECT
				m.`adid`,
				m.`last_name`,
				m.`first_name`,
				m.`middle_name`,
				m.`department`,
				m.`organization`,
				m.`position`,
				m.`phone_internal`,
				m.`phone_external`,
				m.`phone_mobile`,
				m.`mail`,
				m.`reserved1`,
				m.`reserved2`,
				m.`reserved3`,
				m.`reserved4`,
				m.`reserved5`,
				m.`map`,
				m.`x`,
				m.`y`,
				DATE_FORMAT(m.`birthday`, \'%d.%m.%Y\') AS birthday,
				m.`type`,
				m.`flags`
			FROM `@contacts` AS m
			WHERE m.`id` = # LIMIT 1', $contact_id
		)))
		{
			echo '{"code": 1, "message": "Contact not found"}';
			return;
		}

		$contact = $contact[0];
	}
	else
	{
		$contact = array(
			// 'last_name' => '',
			'first_name' => '',
			// 'middle_name' => '',
			'department' => '',
			'organization' => '',
			'position' => '',
			'phone_internal' => '',
			'phone_external' => '',
			'mail' => '',
			'phone_mobile' => '',
			'type' => '',
			'reserved1' => '',
			'reserved2' => '',
			'reserved3' => '',
			'reserved4' => '',
			'reserved5' => '',
			'birthday' => ''
		);
	}

	$result_json = array(
		'code' => 0,
		'message' => '',
		'title' => LL('EditContact'),
		'action' => 'contact_save',
		'fields' => array(
			array(
				'type' => 'hidden',
				'name' => 'id',
				'value' => $contact_id
			),/*
			array(
				'type' => 'string',
				'name' => 'last_name',
				'title' => LL('LastName').'*',
				'value' => $contact['last_name']
			),*/
			array(
				'type' => 'string',
				'name' => 'first_name',
				'title' => LL('FirstName').'*',
				'value' => $contact['first_name'],
				'maxlength' => CONTACT_NAME_MAX
			),/*
			array(
				'type' => 'string',
				'name' => 'middle_name',
				'title' => LL('MiddleName'),
				'value' => $contact['middle_name']
			),*/
			array(
				'type' => 'string',
				'name' => 'department',
				'title' => LL('Department'),
				'value' => $contact['department'],
				'maxlength' => CONTACT_TEXT_DB_MAX
			),
			array(
				'type' => 'string',
				'name' => 'organization',
				'title' => LL('Organization'),
				'value' => $contact['organization'],
				'maxlength' => CONTACT_TEXT_DB_MAX
			),
			array(
				'type' => 'string',
				'name' => 'position',
				'title' => LL('Position'),
				'value' => $contact['position'],
				'maxlength' => CONTACT_TEXT_DB_MAX
			),
			array(
				'type' => 'string',
				'name' => 'phone_internal',
				'title' => LL('PhoneInternal'),
				'value' => $contact['phone_internal'],
				'digits' => TRUE,
				'minlength' => CONTACT_PHONE_INTERNAL_MIN,
				'maxlength' => CONTACT_PHONE_INTERNAL_MAX
			),
			array(
				'type' => 'string',
				'name' => 'phone_external',
				'title' => LL('PhoneExternal'),
				'value' => $contact['phone_external'],
				'digits' => TRUE,
				'minlength' => CONTACT_PHONE_EXTERNAL_MIN,
				'maxlength' => CONTACT_PHONE_EXTERNAL_MAX
			),
			array(
				'type' => 'string',
				'name' => 'phone_mobile',
				'title' => LL('PhoneCell'),
				'value' => $contact['phone_mobile'],
				'digits' => TRUE,
				'minlength' => CONTACT_PHONE_MOBILE_MIN,
				'maxlength' => CONTACT_PHONE_MOBILE_MAX
			),
			array(
				'type' => 'string',
				'name' => 'mail',
				'title' => LL('Mail'),
				'value' => $contact['mail'],
				'maxlength' => CONTACT_TEXT_DB_MAX
			),
			array(
				'type' => 'list',
				'name' => 'type',
				'title' => LL('Type').'*',
				'value' => $contact['type'],
				'list' => $g_icons,
				'values' => range(0, count($g_icons) - 1)
			),
			/*
			array(
				'type' => 'string',
				'name' => 'reserved1',
				'title' => LL('Reserved1').'*',
				'value' => $contact['reserved1']
			),
			array(
				'type' => 'string',
				'name' => 'reserved2',
				'title' => LL('Reserved2').'*',
				'value' => $contact['reserved2']
			),
			array(
				'type' => 'string',
				'name' => 'reserved3',
				'title' => LL('Reserved3').'*',
				'value' => $contact['reserved3']
			),
			array(
				'type' => 'string',
				'name' => 'reserved4',
				'title' => LL('Reserved4').'*',
				'value' => $contact['reserved4']
			),
			array(
				'type' => 'string',
				'name' => 'reserved5',
				'title' => LL('Reserved5').'*',
				'value' => $contact['reserved5']
			),
			*/
			array(
				'type' => 'date',
				'name' => 'birthday',
				'title' => LL('Birthday'),
				'value' => empty($contact['birthday'])?'':$contact['birthday']
			)
		)
	);

	echo json_encode($result_json);

	/* // *** start cut here ***
	$line = '';

	$f = @fopen('\\\\server.with.logs\\logs$\\'.$db->data[0][1].'.txt', 'r');
	if($f !== false)
	{
		$cursor = -1;

		fseek($f, $cursor, SEEK_END);
		$char = fgetc($f);

		for($i = 0; $i < 3; $i++)
		{
			// Trim trailing newline chars of the file
			while ($char === "\n" || $char === "\r") {
				fseek($f, $cursor--, SEEK_END);
				$char = fgetc($f);
			}

			// Read until the start of file or first newline char
			while ($char !== false && $char !== "\n" && $char !== "\r") {
				// Prepend the new char
				$line = $char . $line;
				fseek($f, $cursor--, SEEK_END);
				$char = fgetc($f);
			}

			if(preg_match('/logged into ([^\s]+) ip \d+\.\d+\.\d+\.\d+ using/', $line, $match))
			{
				$compname[$i] = $match[1];
			}
		}
	}
	// *** end cut here *** */
}

