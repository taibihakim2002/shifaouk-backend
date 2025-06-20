
const mongoose = require("mongoose");
const Consultation = require("../models/consultationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Conversation = require("../models/ConversationModel");
const Message = require("../models/MessageModel");
exports.sendMessage = catchAsync(async (req, res, next) => {
    const { consultationId, text } = req.body;
    const userId = req.user._id;




    const consultation = await Consultation.findById(consultationId);

    if (!consultation || !["confirmed", "completed"].includes(consultation.status)) {
        return next(new AppError("الاستشارة غير موجودة أو لم يتم تأكيدها", 403));
    }

    if (
        consultation.doctor.toString() !== userId.toString() &&
        consultation.patient.toString() !== userId.toString()
    ) {
        return next(new AppError("غير مصرح لك بإرسال الرسائل في هذه الاستشارة", 403));
    }

    const expirationDate = new Date(consultation.date);
    expirationDate.setDate(expirationDate.getDate() + 7);

    if (new Date() > expirationDate) {
        return next(new AppError("انتهت صلاحية الدردشة لهذه الاستشارة", 403));
    }

    // البحث أو إنشاء المحادثة
    let conversation = await Conversation.findOne({ consultation: consultation._id });
    if (!conversation) {
        conversation = await Conversation.create({
            consultation: consultation._id,
            doctor: consultation.doctor,
            patient: consultation.patient,
            expiresAt: expirationDate,
        });
    }

    const message = await Message.create({
        conversation: conversation._id,
        sender: userId,
        text,
    });

    res.status(201).json({
        status: "success",
        message: "تم إرسال الرسالة",
        data: { message },
    });
});

exports.getMessages = catchAsync(async (req, res, next) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId).populate("consultation");
    if (!conversation) {
        return next(new AppError("المحادثة غير موجودة", 404));
    }

    const isMember =
        conversation.doctor.toString() === userId.toString() ||
        conversation.patient.toString() === userId.toString();

    if (!isMember) {
        return next(new AppError("غير مصرح لك بعرض هذه المحادثة", 403));
    }

    if (new Date() > conversation.expiresAt) {
        return next(new AppError("انتهت صلاحية هذه المحادثة", 403));
    }

    const messages = await Message.find({ conversation: conversation._id }).sort("createdAt");

    res.status(200).json({
        status: "success",
        results: messages.length,
        data: messages,
    });
});
exports.getMyConversations = catchAsync(async (req, res, next) => {
    const userId = req.user._id;


    const conversations = await Conversation.find({
        $or: [
            { doctor: userId },
            { patient: userId }
        ],
        // expiresAt: { $gte: new Date() },
    })
        .populate({
            path: "consultation",
            match: {
                status: { $in: ["confirmed", "completed"] },
                date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            populate: [
                "doctor", "patient"],
        })
        .sort("-updatedAt");

    const filtered = conversations.filter(c => c.consultation !== null);

    res.status(200).json({
        status: "success",
        results: filtered.length,
        data: filtered,

    });
});
