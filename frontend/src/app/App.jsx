import { Route, Routes } from "react-router-dom";
import HomePage from "../pages/HomePage.jsx";
import CatalogPage from "../pages/CatalogPage.jsx";
import DeviceDetailPage from "../pages/DeviceDetailPage.jsx";
import ModulePage from "../pages/ModulePage.jsx";
import AuthPage from "../pages/AuthPage.jsx";
import MyRentalsPage from "../pages/MyRentalsPage.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import FavoritesPage from '../pages/FavoritesPage.jsx';
import AccountPage from '../pages/AccountPage.jsx';
import NotificationsPage from '../pages/NotificationsPage.jsx';
import SupportInboxPage from '../pages/SupportInboxPage.jsx';
import SupportChat from '../components/chat/SupportChat.jsx';
export default function App() {
  return (
    <><Routes>
      <Route path="/nhan-vien/tin-nhan" element={<SupportInboxPage />} />
      <Route path="/nhan-vien/quan-ly" element={<AdminPage />} />
      <Route path="/nhan-vien/quan-ly/:section" element={<AdminPage />} />
      <Route path="/admin/tin-nhan" element={<SupportInboxPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/:section" element={<AdminPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/dang-nhap" element={<AuthPage key="login" />} />
      <Route path="/dang-ky" element={<AuthPage key="register" registration />} />
      <Route path="/yeu-cau-thue" element={<MyRentalsPage />} />
      <Route path="/yeu-thich" element={<FavoritesPage />} />
      <Route path="/tai-khoan" element={<AccountPage />} />
      <Route path="/thong-bao" element={<NotificationsPage />} />
      <Route path="/thiet-bi" element={<CatalogPage />} />
      <Route path="/devices" element={<CatalogPage />} />
      <Route path="/thiet-bi/:id" element={<DeviceDetailPage />} />
      <Route path="/devices/:id" element={<DeviceDetailPage />} />
      <Route path="*" element={<ModulePage title="Không tìm thấy trang" />} />
    </Routes><SupportChat /></>
  );
}
