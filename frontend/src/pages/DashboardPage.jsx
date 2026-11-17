import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api.js';
export default function DashboardPage() {
  const [connection, setConnection] = useState('Đang kiểm tra API...');
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/health', { signal: controller.signal })
      .then(() => setConnection('API và MongoDB đã kết nối'))
      .catch(error => { if (error.name !== 'AbortError') setConnection('Chưa kết nối. Kiểm tra backend và MongoDB.'); });
    return () => controller.abort();
  }, []);
  return <section><p className="text-sm font-semibold text-teal-700">KHỞI TẠO DỰ ÁN</p><h2 className="mt-2 text-3xl font-bold">Tổng quan hệ thống</h2><p className="mt-4 leading-7 text-slate-600">Bộ khung React, Express và MongoDB. Chọn phân hệ để tiếp tục phát triển.</p><div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-6"><h3 className="font-bold">Trạng thái kết nối</h3><p role="status" className="mt-2">{connection}</p></div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-bold">Quy trình nghiệp vụ</h3><p className="mt-3 leading-8 text-slate-600">Đăng nhập → Xem thiết bị → Đăng ký mượn → Xét duyệt → Bàn giao → Trả thiết bị → Hoàn thành</p></div><p className="mt-6 text-sm text-slate-500">Cấu trúc ban đầu; chức năng nghiệp vụ và xác thực chưa triển khai.</p></section>;
}
