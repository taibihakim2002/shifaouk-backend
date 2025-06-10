const mongoose = require("mongoose");

const consultationReportSchema = new mongoose.Schema({
    consultation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consultation",
        required: true,
        unique: true, // استشارة واحدة = تقرير واحد
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    summary: {
        type: String,
        required: true,
        maxlength: 2000,
        trim: true,
        // مثال: "المريض يعاني من صداع مزمن منذ أسبوعين..."
    },
    diagnosis: {
        type: String,
        required: true,
        maxlength: 1000,
        // تشخيص الطبيب
    },
    patientCondition: {
        type: String,
        enum: ["جيدة", "متوسطة", "سيئة", "مستقرة", "تدهورت"],
        required: true
    },
    medications: [
        {
            name: { type: String, required: true },
            dosage: String,         // الجرعة: مثلًا "مرتين في اليوم"
            duration: String        // المدة: مثلًا "لمدة أسبوع"
        }
    ],
    recommendedTests: [String], // اختبارات مقترحة: "تحليل دم", "أشعة"
    lifestyleAdvice: {
        type: String,
        maxlength: 1000 // نصائح مثل "قلل من تناول الدهون، مارس الرياضة..."
    },
    nextConsultationDate: {
        type: Date
    },
    attachments: [
        {
            url: String,
            public_id: String,
            format: String
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ConsultationReport = mongoose.model("ConsultationReport", consultationReportSchema);
module.exports = ConsultationReport;
