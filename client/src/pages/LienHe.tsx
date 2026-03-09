import { useState } from "react"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, Mail, Clock, MapPin } from "lucide-react"

export default function LienHe() {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        company: "",
        subject: "",
        question: "",
    })

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Implement actual form submission to backend
        toast.success("Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.")
        setFormData({
            name: "",
            phone: "",
            email: "",
            company: "",
            subject: "",
            question: "",
        })
    }

    return (
        <div className="w-full">
            {/* Banner Section */}
            <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 py-8 lg:py-12 overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white text-center">
                        Liên hệ
                    </h1>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12 lg:py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Left Column - Contact Form */}
                        <div>
                            <Card className="border-2 border-gray-200 shadow-lg">
                                <CardContent className="p-6 lg:p-8">
                                    <p className="text-gray-700 mb-6 leading-relaxed">
                                        Hãy liên hệ khi bạn gặp bất cứ vấn đề nào liên quan đến công ty hoặc dịch vụ của chúng tôi. Chúng tôi sẽ cố gắng phản hồi trong thời gian sớm nhất.
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <Label htmlFor="name" className="text-gray-900">
                                                Tên của bạn <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="mt-1"
                                                placeholder="Nhập tên của bạn"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="phone" className="text-gray-900">
                                                Số điện thoại
                                            </Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="mt-1"
                                                placeholder="Nhập số điện thoại"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="email" className="text-gray-900">
                                                Email của bạn <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="mt-1"
                                                placeholder="Nhập email của bạn"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="company" className="text-gray-900">
                                                Công ty của bạn
                                            </Label>
                                            <Input
                                                id="company"
                                                name="company"
                                                type="text"
                                                value={formData.company}
                                                onChange={handleChange}
                                                className="mt-1"
                                                placeholder="Nhập tên công ty"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="subject" className="text-gray-900">
                                                Tiêu đề <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="subject"
                                                name="subject"
                                                type="text"
                                                required
                                                value={formData.subject}
                                                onChange={handleChange}
                                                className="mt-1"
                                                placeholder="Nhập tiêu đề"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="question" className="text-gray-900">
                                                Câu hỏi
                                            </Label>
                                            <Textarea
                                                id="question"
                                                name="question"
                                                value={formData.question}
                                                onChange={handleChange}
                                                className="mt-1 min-h-[120px]"
                                                placeholder="Nhập câu hỏi hoặc nội dung bạn muốn gửi"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                                            size="lg"
                                        >
                                            Gửi
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Contact Information */}
                        <div>
                            <Card className="border-2 border-gray-200 shadow-lg">
                                <CardContent className="p-6 lg:p-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        Thông tin liên hệ:
                                    </h2>

                                    <div className="space-y-6">
                                        {/* Head Office */}
                                        <div>
                                            <div className="flex items-start gap-3 mb-2">
                                                <MapPin className="h-5 w-5 text-teal-600 mt-1 flex-shrink-0" />
                                                <div>
                                                    <h3 className="font-bold text-gray-900 mb-1">
                                                        Trụ sở chính
                                                    </h3>
                                                    <p className="text-gray-700 leading-relaxed">
                                                        Tổ 9, phường Tân Lập, TP Thái Nguyên
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Central Office */}
                                        <div>
                                            <div className="flex items-start gap-3 mb-2">
                                                <MapPin className="h-5 w-5 text-teal-600 mt-1 flex-shrink-0" />
                                                <div>
                                                    <h3 className="font-bold text-gray-900 mb-1">
                                                        Văn phòng Miền Trung
                                                    </h3>
                                                    <p className="text-gray-700 leading-relaxed">
                                                        Tầng 2, Bến xe Trung Tâm Đà Nẵng, Đường Tôn Đức Thắng, P. Hòa Minh, Q. Liên Chiểu, Thành phố Đà Nẵng.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Southern Office */}
                                        <div>
                                            <div className="flex items-start gap-3 mb-2">
                                                <MapPin className="h-5 w-5 text-teal-600 mt-1 flex-shrink-0" />
                                                <div>
                                                    <h3 className="font-bold text-gray-900 mb-1">
                                                        Văn phòng Miền Nam
                                                    </h3>
                                                    <p className="text-gray-700 leading-relaxed">
                                                        Số 43, Đường Nguyễn Trọng Trí, Phường An Lạc A, Quận Bình Tân - TP Hồ Chí Minh
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Details */}
                                        <div className="pt-4 border-t border-gray-200 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Phone className="h-5 w-5 text-teal-600 flex-shrink-0" />
                                                <span className="text-gray-700">02083.607.668</span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Mail className="h-5 w-5 text-teal-600 flex-shrink-0" />
                                                <a
                                                    href="mailto:abctn@gmail.com"
                                                    className="text-teal-600 hover:text-teal-700 hover:underline"
                                                >
                                                    abctn@gmail.com
                                                </a>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-bold text-teal-600">
                                                    Hotline: 1900.4751
                                                </span>
                                            </div>
                                        </div>

                                        {/* Support Hours */}
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="flex items-start gap-3">
                                                <Clock className="h-5 w-5 text-teal-600 mt-1 flex-shrink-0" />
                                                <div>
                                                    <h3 className="font-bold text-gray-900 mb-2">
                                                        Thời gian hỗ trợ sản phẩm hàng ngày
                                                    </h3>
                                                    <div className="space-y-1 text-gray-700">
                                                        <p>Bắt đầu: 03:00</p>
                                                        <p>Kết thúc: 22:00</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

