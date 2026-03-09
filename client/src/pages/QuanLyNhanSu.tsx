import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Shield,
  RefreshCw,
  X,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ActionMenu } from "@/components/ui/ActionMenu"
import { userService, type User, type CreateUserData, type UpdateUserData } from "@/services/user.service"
import { locationService } from "@/services/location.service"
import type { Location } from "@/types"

const ITEMS_PER_PAGE = 50

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  dispatcher: 'Điều độ viên',
  accountant: 'Kế toán',
  reporter: 'Báo cáo',
  user: 'Người dùng',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  dispatcher: 'bg-blue-100 text-blue-700',
  accountant: 'bg-green-100 text-green-700',
  reporter: 'bg-orange-100 text-orange-700',
  user: 'bg-slate-100 text-slate-700',
}

export default function QuanLyNhanSu() {
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // Form states
  const [formData, setFormData] = useState<CreateUserData & { id?: string; benPhuTrach?: string | null }>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'user',
    isActive: true,
    benPhuTrach: null,
  })

  useEffect(() => {
    loadUsers()
    loadLocations()
  }, [currentPage, searchQuery, filterRole, filterActive])

  const loadLocations = async () => {
    try {
      const data = await locationService.getAll(true) // Only active locations
      setLocations(data)
    } catch (error) {
      console.error("Failed to load locations:", error)
    }
  }

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await userService.getAll({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery || undefined,
        role: filterRole || undefined,
        isActive: filterActive,
      })
      setUsers(response.data)
      setTotal(response.pagination.total)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error("Failed to load users:", error)
      toast.error("Không thể tải danh sách nhân sự")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setIsEditMode(false)
    setSelectedUser(null)
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'user',
      isActive: true,
      benPhuTrach: null,
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setIsEditMode(true)
    setSelectedUser(user)
    setFormData({
      id: user.id,
      email: user.email,
      password: '', // Don't pre-fill password
      name: user.name || '',
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      benPhuTrach: user.benPhuTrach || null,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (isEditMode && selectedUser) {
        const updateData: UpdateUserData = {
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          isActive: formData.isActive,
          benPhuTrach: formData.benPhuTrach || null,
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        await userService.update(selectedUser.id, updateData)
        toast.success("Cập nhật nhân sự thành công")
      } else {
        await userService.create(formData as CreateUserData)
        toast.success("Tạo nhân sự thành công")
      }
      setIsDialogOpen(false)
      loadUsers()
    } catch (error: any) {
      console.error("Failed to save user:", error)
      toast.error(error.response?.data?.error || "Không thể lưu nhân sự. Vui lòng thử lại.")
    }
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return
    try {
      await userService.delete(userToDelete.id)
      toast.success("Xóa nhân sự thành công")
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error) {
      console.error("Failed to delete user:", error)
      toast.error("Không thể xóa nhân sự. Vui lòng thử lại.")
    }
  }

  const stats = {
    total,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    admin: users.filter(u => u.role === 'admin').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-xl shadow-emerald-500/30">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý Nhân sự
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Quản lý thông tin người dùng hệ thống
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={loadUsers}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              onClick={handleCreate}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold hover:from-emerald-600 hover:to-green-600 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm nhân sự
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-sm text-slate-500 mt-1">Tổng số nhân sự</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-100">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.active}</p>
            <p className="text-sm text-slate-500 mt-1">Đang hoạt động</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-100">
                <UserX className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.inactive}</p>
            <p className="text-sm text-slate-500 mt-1">Ngừng hoạt động</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.admin}</p>
            <p className="text-sm text-slate-500 mt-1">Quản trị viên</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Tất cả vai trò</option>
            <option value="admin">Quản trị viên</option>
            <option value="dispatcher">Điều độ viên</option>
            <option value="accountant">Kế toán</option>
            <option value="reporter">Báo cáo</option>
            <option value="user">Người dùng</option>
          </select>

          <select
            value={filterActive === undefined ? '' : filterActive.toString()}
            onChange={(e) => {
              const value = e.target.value
              setFilterActive(value === '' ? undefined : value === 'true')
              setCurrentPage(1)
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng hoạt động</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[200px]">Người dùng</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[200px]">Email</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[140px]">Số điện thoại</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[130px]">Vai trò</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[180px]">Bến phụ trách</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-[130px]">Trạng thái</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Đang tải...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-800 truncate">{user.name || 'Chưa có tên'}</p>
                            <p className="text-sm text-slate-500 truncate">{user.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-slate-600 min-w-0">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {user.phone ? (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {user.benPhuTrachName ? (
                          <span className="text-slate-700 font-medium truncate block">{user.benPhuTrachName}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block ${
                          user.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {user.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <ActionMenu
                            items={[
                              {
                                label: "Sửa",
                                onClick: () => handleEdit(user),
                                variant: "warning",
                              },
                              {
                                label: "Xóa",
                                onClick: () => handleDelete(user),
                                variant: "danger",
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Trang {currentPage} / {totalPages} ({total} nhân sự)
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg"
                >
                  Trước
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">
                {isEditMode ? 'Chỉnh sửa nhân sự' : 'Thêm nhân sự mới'}
              </h2>
              <Button
                onClick={() => setIsDialogOpen(false)}
                className="p-2 h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="name">Họ và tên *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="role">Vai trò *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="mt-1 w-full px-4 py-2 rounded-xl border border-slate-200"
                >
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="dispatcher">Điều độ viên</option>
                  <option value="accountant">Kế toán</option>
                  <option value="reporter">Báo cáo</option>
                </select>
              </div>

              <div>
                <Label htmlFor="password">
                  {isEditMode ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1"
                  required={!isEditMode}
                />
              </div>

              <div>
                <Label htmlFor="benPhuTrach">Bến phụ trách</Label>
                <select
                  id="benPhuTrach"
                  value={formData.benPhuTrach || ''}
                  onChange={(e) => setFormData({ ...formData, benPhuTrach: e.target.value || null })}
                  className="mt-1 w-full px-4 py-2 rounded-xl border border-slate-200"
                >
                  <option value="">-- Chọn bến phụ trách --</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} {location.code ? `(${location.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Tài khoản đang hoạt động
                </Label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button
                onClick={() => setIsDialogOpen(false)}
                className="px-6 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Xác nhận xóa</h3>
            <p className="text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa nhân sự <strong>{userToDelete.name || userToDelete.email}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-6 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmDelete}
                className="px-6 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600"
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
