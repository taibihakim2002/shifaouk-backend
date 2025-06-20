const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    consultation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultation',
        unique: true,
        required: true,
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);



const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;