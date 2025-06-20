const express = require('express');
const { protect } = require('../controllers/authController');
const { sendMessage, getMessages, getMyConversations } = require('../controllers/messageController');
const router = express.Router();

router.use(protect)

router.route("/").post(sendMessage).get(getMyConversations);
router.get('/:conversationId', getMessages);


module.exports = router;