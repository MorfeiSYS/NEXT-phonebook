<?php
/*
Api для подключения справочника к FreePBX
*/

require_once __DIR__.DIRECTORY_SEPARATOR.'inc.config.php';

// Проверяем наличие параметра NUMBER
if (!isset($_GET['NUMBER'])) {
    http_response_code(400); // Возвращаем ошибку 400 Bad Request
    echo 'Ошибка: Номер отсутствует.';
    exit;
}

$number = preg_replace("/[^0-9]/", "", $_GET['NUMBER']);
if (strlen($number) <= 2){
    http_response_code(200); // Если номера в книге нет Возвращаем 200 OK! и тот номер который отправлен в API.
    echo $number;
    exit;
}

// Проверяем наличие параметра API_KEY
if (!isset($_GET['API_KEY'])) {
    http_response_code(400); // Возвращаем ошибку 400 Bad Request
    echo 'Ошибка: параметр API_KEY отсутствует.';
    exit;
}

$apiKey = $_GET['API_KEY'];

// Проверяем, что параметр API_KEY не превышает 64 символа
if (strlen($apiKey) > 64) {
    http_response_code(400); // Возвращаем ошибку 400 Bad Request
    echo 'Ошибка: параметр API_KEY не должен превышать 64 символа.';
    exit;
}

$validKeys = array();
if(defined('API_FREEEPBX_KEYS') && API_FREEEPBX_KEYS !== '')
{
	if(is_array(API_FREEEPBX_KEYS))
	{
		$validKeys = API_FREEEPBX_KEYS;
	}
	else
	{
		foreach(explode(',', API_FREEEPBX_KEYS) as $k)
		{
			$k = trim($k);
			if($k !== '')
			{
				$validKeys[] = $k;
			}
		}
	}
}

// Проверяем валидность API ключа
if(empty($validKeys) || !in_array($apiKey, $validKeys, true)) {
    http_response_code(401); // Возвращаем ошибку 401 Unauthorized
    echo 'Ошибка: неавторизованный доступ.';
    exit;
}

// Устанавливаем соединение с базой данных
$mysqli = new mysqli(DB_RW_HOST, DB_USER, DB_PASSWD, DB_NAME);

// Проверяем соединение на ошибки
if ($mysqli->connect_errno) {
    http_response_code(500); // Возвращаем ошибку 500 Internal Server Error
    echo 'Ошибка подключения к базе данных.';
    exit;
}

// Защищаем запрос от SQL-инъекций
$number = $mysqli->real_escape_string($number);

// Установка кодировки соединения с MySQL для корректной работы с UTF-8
$mysqli->set_charset("utf8mb4");

// Выполнение запроса к базе данных
if (strlen($number) == 3 || strlen($number) == 4 || strlen($number) == 5) {
    // Формируем регулярное выражение для поиска
    $escapedNumber = $mysqli->real_escape_string($number);
    // Учитываем пробелы, скобки, запятые или начало/конец строки как возможные разделители
    $regexPattern = "(^|[^0-9])" . $escapedNumber . "([^0-9]|$)";

$query = "SELECT first_name, last_name, middle_name FROM " . DB_PREFIX . "contacts WHERE phone_internal REGEXP '".$regexPattern."' AND flags NOT IN (0, 4, 12) LIMIT 1";

$result = $mysqli->query($query);

// Проверка наличия результатов
if (!$result->num_rows) {
    http_response_code(200); // Если номер не найден, возвращаем 200 OK и номер
    echo $number;
    exit;
}

// Получаем строки ФИО
$row = $result->fetch_assoc();
$firstName = $row['first_name'];
$lastName = $row['last_name'];
$middleName = $row['middle_name'];

// Объединяем ФИО, если заполнены все поля
if ($lastName && $firstName && $middleName) {
    $fullName = $lastName . ' ' . $firstName . ' ' . $middleName;
} elseif ($lastName && $firstName) {
    $fullName = $lastName . ' ' . $firstName;
} else {
    $fullName = $firstName;
}

// Преобразуем ФИО в нужный вид и ограничиваем длину до 30 символов
$parts = explode(' ', $fullName);
$lastname = $parts[0];
$firstname = $parts[1];
$patronymic = $parts[2] ?? '';

$shortName = $lastname . ' ' . mb_substr($firstname, 0, 1, 'UTF-8') . '.' . mb_substr($patronymic, 0, 1, 'UTF-8') . '.';
$shortName = mb_substr($shortName, 0, 30, 'UTF-8');

//Для фильтрации специальных символов в переменной
$shortName = filter_var($shortName, FILTER_SANITIZE_STRING);
// Возвращаем результат
echo $shortName;

// Закрываем соединение с базой данных
$mysqli->close();

exit;
}

if (strlen($number) > 5 && strlen($number) < 10) {
    http_response_code(200);
    echo $number;
    $mysqli->close();
    exit;
}

if (strlen($number) >= 10){
$query = "SELECT first_name FROM " . DB_PREFIX. "contacts WHERE phone_mobile LIKE '%".$number."%' LIMIT 1";

$result = $mysqli->query($query);

// Проверяем наличие результатов
if (!$result->num_rows) {
    http_response_code(200); // Если номера в книге нет Возвращаем 200 OK! и тот номер который отправлен в API.
    echo $number;
    exit;
}

// Получаем строку ФИО
$row = $result->fetch_assoc();
$fio = $row['first_name'];

// Преобразуем ФИО в нужный вид и ограничиваем длину до 30 символов
$parts = explode(' ', $fio);
$lastname = $parts[0];
$firstname = $parts[1];
$patronymic = $parts[2];

$shortName = $lastname . ' ' . mb_substr($firstname, 0, 1, 'UTF-8') . '.' . mb_substr($patronymic, 0, 1, 'UTF-8') . '.';
$shortName = mb_substr($shortName, 0, 30, 'UTF-8');

//Для фильтрации специальных символов в переменной
$shortName = filter_var($shortName, FILTER_SANITIZE_STRING);
// Возвращаем результат
echo $shortName;
//echo json_encode($shortName);

// Закрываем соединение с базой данных
$mysqli->close();

exit;
}

// Закрываем соединение с базой данных
$mysqli->close();
?>