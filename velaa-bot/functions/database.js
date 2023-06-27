const functions = require('firebase-functions');
const mysql = require('mysql2');
// const crypto = require('crypto');
// const CryptoJS = require('crypto-js');
// const bcrypt = require('bcryptjs');



const connection = mysql.createConnection({
    host: functions.config().db.db_host,
    user: functions.config().db.db_user,
    password: functions.config().db.db_password,
    database: functions.config().db.db_dataname,
    port: functions.config().db.db_port
});

function queryDatabase(query, values) {
    return new Promise((resolve, reject) => {
        connection.query(query, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

function checkUserId(userId, callback) {
    const query = "SELECT * FROM tb_profile WHERE emp_kyline = ?";
    const values = [userId];

    // console.log('Query:', query); // แสดงคำสั่ง SQL ใน console
    // console.log('Values:', values); // แสดงค่าพารามิเตอร์ใน console

    queryDatabase(query, values)
        .then((results) => {
            callback(null, results);
        })
        .catch((error) => {
            callback(error);
        });
}

function checkUserCredentials(useremployee, userIdLine, emailLine, telLine, callback) {

    const query = 'SELECT * FROM tb_profile INNER JOIN tb_branch ON tb_profile.rf_branch_id = tb_branch.branch_id  WHERE name_id = ?';
    const values = [Useremployee];

    queryDatabase(query, values)
        .then((results) => {
            if (results.length === 1) {
                const nameId = results[0].name_id;
                const empEmail = results[0].emp_email;
                const empTel = results[0].emp_tel;
                const empKyline = results[0].emp_kyline;

                if (empKyline === '') {
                    if (empEmail === emailLine || empTel === telLine) {
                        console.log("Login successfully");
                        updateUser(userIdLine, nameId, (error, updatedUser) => {
                            if (error) {
                                console.error('เกิดข้อผิดพลาดในการอัปเดตผู้ใช้:', error);
                                callback(error, null);
                            } else {
                                console.log('อัปเดตผู้ใช้สำเร็จ:', updatedUser);
                                callback(null, results);

                            }
                        });
                    } else {

                        console.log("The data does not match in the database.");
                        callback(null, []); // ส่งอาร์เรย์เปล่ากลับ
                    }

                } else if (userIdLine === empKyline) {
                    if (empEmail === emailLine || empTel === telLine) {

                        console.log("Login successfully");
                        callback(null, results);

                    } else {

                        console.log("The data does not match in the database.");
                        callback(null, []); // ส่งอาร์เรย์เปล่ากลับ
                    }
                }
                else {

                    console.log("Not's UserId in Data");
                    callback(null, []); // ส่งอาร์เรย์เปล่ากลับ
                }

            } else {
                // ไม่พบผู้ใช้หรือมีผู้ใช้มากกว่า 1 รายการ
                callback(null, []); // ส่งอาร์เรย์เปล่ากลับ
            }

            console.log('Results:', results);
        })
        .catch((error) => {
            callback(error, null);
        });
}

function updateUser(userId, nameId, callback) {
    const query = "UPDATE tb_profile SET emp_kyline = ? WHERE name_id = ?";
    const values = [userId, nameId];

    queryDatabase(query, values)
        .then((result) => {
            console.log("Profile updated successfully");
            callback(null, result[0]);
        })
        .catch((error) => {
            console.error("Error updating profile:", error);
            callback(error, []);
        });
}

function selectPaySlip(nameId, month, year, callback) {
    const query = "SELECT * FROM tb_paydata WHERE rf_name_id = ? AND paypr_month = ? AND paypr_year = ?";
    const values = [nameId, month, year];

    queryDatabase(query, values)
        .then((results) => {
            console.log("Query results:", results);
            callback(null, results[0]);
        })
        .catch((error) => {
            console.error("Error querying database:", error);
            callback(error, []);
        });
}

module.exports = {
    connection,
    checkUserId,
    checkUserCredentials,
    selectPaySlip


};
