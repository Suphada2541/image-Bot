const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const express = require("express");
const bodyParser = require('body-parser');
const { SessionsClient } = require("dialogflow");
const { WebhookClient } = require("dialogflow-fulfillment")
const { postToDialogflow, createLineTextEvent, convertToDialogflow } = require("./dialogflow")
const { connection, checkUserCredentials, updateUser } = require("./database"); // Import the database module



const config = {
    channelAccessToken: functions.config().line.channel_access_token,
    channelSecret: functions.config().line.channel_secret
}

const app = express();

async function handleEvent(req, event) {
    switch (event.type) {
        case 'message':
            switch (event.message.type) {
                case 'text':
                    return handleText(req, event);
                case 'location':
                    return handleLocation(req, event);
            }
        case 'postback':
            return handlePostback(req, event);
        default:
            throw new Error(`Unknown event: ${JSON.stringify(event)}`);
    }
}

async function handleText(req, event) {
    const messageText = event.message.text.toLowerCase();
    if (messageText.includes('login')) {
        // เช็ค userId ในฐานข้อมูลก่อน
        const userId = event.source.userId;
        // console.log('userId : ', userId);
        const loginLIFFUrl = 'https://liff.line.me/1661078665-oAvA2J2O';
        const lineReplyToken = event.replyToken;
        const lineClient = new line.Client(config);

        const lineMessage = {
            type: 'text',
            text: 'กรุณาเข้าสู่ระบบด้วย LIFF',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        action: {
                            type: 'uri',
                            label: 'ลงชื่อเข้าใช้งาน',
                            uri: loginLIFFUrl
                        }
                    }
                ]
            }
        };

        lineClient.replyMessage(lineReplyToken, lineMessage)
            .then(() => {
                console.log('Reply message sent');
            })
            .catch((error) => {
                console.error('Error replying message:', error);
            });
    } else {
        // กรณีอื่นๆ ส่งข้อความไปยัง Dialogflow เพื่อประมวลผล
        return postToDialogflow(req);
    }
}

function handleLocation(req, event) {
    const message = event.message;
    const newEvent = createLineTextEvent(req, event, `LAT : ${message.latitude}, LNG : ${message.longitude}`);
    convertToDialogflow(req, newEvent);
}

function handlePostback(req, event) {
    const data = event.postback.params.date;
    const newEvent = createLineTextEvent(req, event, `DATE: ${data}`);
    convertToDialogflow(req, newEvent);
}



app.post('/webhook', line.middleware(config), async (req, res) => {
    try {
        const events = req.body.events;
        await Promise.all(events.map(event => handleEvent(req, event)));
        res.sendStatus(200);
    } catch (error) {
        console.error('Error handling LINE events:', error);
        res.sendStatus(500);
    }
});

app.use(express.json({ limit: '50mb' }));
app.post('/fulfillment', (request, response) => {
    const agent = new WebhookClient({ request, response });
    const intentMap = new Map();
    // intentMap.set('Login - user', handleFulfillmentlogin);
    agent.handleRequest(intentMap);
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.post('/user-login', (req, res) => {
    connection.connect(function (error) {
        if (error) {
            console.error('Error connecting to database:', error);
            res.sendStatus(500);
        } else {
            console.log('Connected to database');
            const bodyString = req.body;
            const body = JSON.parse(bodyString);

            const useremployee = body.Useremployee;
            const userIdLine = body.userIdLine;
            const emailLine = body.emailLine;
            const telLine = body.telLine;

            // เรียกใช้ฟังก์ชัน checkUserCredentials หลังจากเชื่อมต่อกับฐานข้อมูลเสร็จสมบูรณ์
            checkUserCredentials(useremployee, userIdLine, emailLine, telLine, function (error, results) {
                if (error) {
                    console.error('Error checking user credentials:', error);
                    res.sendStatus(500);
                } else {
                    if (results.length > 0) {

                        const name_id = results[0].name_id;
                        const emp_name = results[0].emp_name;
                        const emp_surname = results[0].emp_surname;
                        const branch_tyapp = results[0].branch_tyapp;

                        // สร้างข้อความที่จะส่งกลับผู้ใช้
                        const message = 'ชื่อ - นามสกุล :' + emp_name + ' ' + emp_surname + ' รหัสพนักงาน :' + name_id + 'กลุ่มผู้ใช้ : user' + branch_tyapp;

                        // ส่งข้อความแจ้งเตือนกลับไปยังผู้ใช้
                        res.send(message);


                    } else {
                        // ไม่พบผู้ใช้ในระบบ สร้างข้อความแจ้งเตือน
                        const message = 'ลงชื่อเข้าใช้ไม่สำเร็จ';

                        // ส่งข้อความแจ้งเตือนกลับไปยังผู้ใช้
                        res.send(message);
                    }
                }
            });
        }
    });
});




// app.listen(3000, () => {
//     console.log('Bot API server is running on port 3000');
// });


exports.api = functions
    .region('asia-northeast1')
    .https.onRequest(app);


