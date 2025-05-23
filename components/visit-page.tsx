"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Eye, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface Visit {
  id: string;
  clientName: string;
  staffName: string;
  date: string;
  type: string;
  status: string;
  clientEmail?: string;
  address?: string;
  notes?: string;
}

interface Staff {
  _id: string;
  fullname: string;
}

interface VisitApiResponse {
  _id: string;
  client?: {
    fullname?: string;
    email?: string;
  };
  staff?: {
    fullname?: string;
    _id?: string;
  };
  date: string;
  type?: string;
  status?: string;
  address?: string;
  notes?: string;
}

interface PaginatedVisitsResponse {
  data: VisitApiResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FormData {
  clientEmail: string;
  staff: string;
  address: string;
  date: string;
  time: string;
  type: string;
  notes?: string;
}

interface FormErrors {
  clientEmail: string;
  staff: string;
  address: string;
  date: string;
  time: string;
  type: string;
}

export function VisitPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [isViewVisitOpen, setIsViewVisitOpen] = useState(false);
  const [isEditVisitOpen, setIsEditVisitOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [currentVisit, setCurrentVisit] = useState<Visit | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const session = useSession();
  const token = session.data?.accessToken;

  const [addFormData, setAddFormData] = useState<FormData>({
    clientEmail: "",
    staff: "",
    address: "",
    date: "",
    time: "",
    type: "",
  });

  const [editFormData, setEditFormData] = useState<FormData>({
    clientEmail: "",
    staff: "",
    address: "",
    date: "",
    time: "",
    type: "",
    notes: "",
  });

  const [statusForm, setStatusForm] = useState({
    status: "",
    notes: "",
  });

  const [assignStaffForm, setAssignStaffForm] = useState({
    staffId: "",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    clientEmail: "",
    staff: "",
    address: "",
    date: "",
    time: "",
    type: "",
  });

  // Validation function
  const validateForm = (formData: FormData) => {
    const errors: Partial<FormErrors> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.clientEmail) {
      errors.clientEmail = "Client email is required";
    } else if (!emailRegex.test(formData.clientEmail)) {
      errors.clientEmail = "Invalid email format";
    }

    if (!formData.staff) errors.staff = "Staff selection is required";
    if (!formData.address) errors.address = "Address is required";
    if (!formData.date) errors.date = "Date is required";
    if (!formData.time) errors.time = "Time is required";
    if (!formData.type) errors.type = "Visit type is required";

    return errors as FormErrors;
  };

  // Clear specific error when input changes
  const clearFormError = (field: keyof FormErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Fetch visits and staff from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) return;

        // Fetch visits with pagination
        const visitsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/visits/get-all-visit?page=${page}&pageSize=${pageSize}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!visitsResponse.ok) throw new Error("Failed to fetch visits");
        const visitsData: PaginatedVisitsResponse = await visitsResponse.json();

        // Fetch staff
        const staffResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/all-staff`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!staffResponse.ok) throw new Error("Failed to fetch staff");
        const { data: staffData } = await staffResponse.json();

        // Transform visits data
        const transformedVisits = visitsData.data.map(
          (visit: VisitApiResponse) => ({
            id: visit._id,
            clientName: visit.client?.fullname || "N/A",
            clientEmail: visit.client?.email || "",
            staffName: visit.staff?.fullname || "Staff not assigned",
            date: visit.date,
            type: visit.type || "N/A",
            status: visit.status || "pending",
            address: visit.address || "",
            notes: visit.notes || "",
          })
        );

        setVisits(transformedVisits);
        setStaffList(staffData);
        setTotalPages(visitsData.totalPages);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      }
    };

    fetchData();
  }, [token, page, pageSize]);

  // Populate edit form when currentVisit changes
  useEffect(() => {
    if (currentVisit) {
      const visitDate = new Date(currentVisit.date);
      setEditFormData({
        clientEmail: currentVisit.clientEmail || "",
        staff:
          staffList.find((s) => s.fullname === currentVisit.staffName)?._id ||
          "",
        address: currentVisit.address || "",
        date: visitDate.toISOString().split("T")[0],
        time: visitDate.toTimeString().slice(0, 5),
        type: currentVisit.type,
        notes: currentVisit.notes || "",
      });
      setAssignStaffForm({
        staffId:
          staffList.find((s) => s.fullname === currentVisit.staffName)?._id ||
          "",
        notes: currentVisit.notes || "",
      });
    }
  }, [currentVisit, staffList]);

  const filteredVisits = visits.filter((visit) => {
    const matchesSearch =
      visit.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || visit.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleAddVisit = async () => {
    const errors = validateForm(addFormData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the form errors");
      return;
    }

    setIsAdding(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const isoDateTime = new Date(
        `${addFormData.date}T${addFormData.time}:00Z`
      ).toISOString();

      const payload = {
        clientEmail: addFormData.clientEmail,
        staff: addFormData.staff,
        address: addFormData.address,
        date: isoDateTime,
        type: addFormData.type,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/visits/create-visit-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add visit");
      }

      const newVisit = await response.json();
      const staffName =
        staffList.find((s) => s._id === addFormData.staff)?.fullname ||
        "Staff not assigned";

      // Update visits state with new visit including staff name
      setVisits((prev) => [
        {
          id: newVisit.data._id,
          clientName: newVisit.data.client?.fullname || addFormData.clientEmail,
          clientEmail: addFormData.clientEmail,
          staffName,
          date: newVisit.data.date,
          type: newVisit.data.type || addFormData.type,
          status: newVisit.data.status || "pending",
          address: addFormData.address,
          notes: newVisit.data.notes || "",
        },
        ...prev,
      ]);

      toast.success("Visit added successfully");
      setIsAddVisitOpen(false);
      setAddFormData({
        clientEmail: "",
        staff: "",
        address: "",
        date: "",
        time: "",
        type: "",
      });
    } catch (error) {
      console.error("Error adding visit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add visit"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditVisit = async () => {
    const errors = validateForm(editFormData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the form errors");
      return;
    }

    if (!currentVisit) return;
    setIsEditing(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const isoDateTime = new Date(
        `${editFormData.date}T${editFormData.time}:00Z`
      ).toISOString();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/visits/update-visit/${currentVisit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientEmail: editFormData.clientEmail,
            staff: editFormData.staff,
            address: editFormData.address,
            date: isoDateTime,
            type: editFormData.type,
            notes: editFormData.notes,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update visit");

      const updatedVisit = await response.json();
      const staffName =
        staffList.find((s) => s._id === editFormData.staff)?.fullname ||
        "Staff not assigned";

      // Update the visit in state
      setVisits((prev) =>
        prev.map((visit) =>
          visit.id === currentVisit.id
            ? {
                ...visit,
                clientName:
                  updatedVisit.data.client?.fullname ||
                  editFormData.clientEmail,
                clientEmail: editFormData.clientEmail,
                staffName,
                date: updatedVisit.data.date,
                type: updatedVisit.data.type || editFormData.type,
                address: editFormData.address,
                notes: editFormData.notes,
              }
            : visit
        )
      );

      toast.success("Visit updated successfully");
      setIsEditVisitOpen(false);
      setCurrentVisit(null);
    } catch (error) {
      console.error("Error updating visit:", error);
      toast.error("Failed to update visit");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;
    setIsDeleting(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/visits/issues/delete-visit/${visitToDelete}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete visit");

      // Optimistically update the UI
      setVisits((prev) => prev.filter((visit) => visit.id !== visitToDelete));
      toast.success("Visit deleted successfully");
    } catch (error) {
      console.error("Error deleting visit:", error);
      toast.error("Failed to delete visit");
    } finally {
      setIsDeleteConfirmOpen(false);
      setVisitToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!currentVisit || !assignStaffForm.staffId) {
      toast.error("Please select a staff member");
      return;
    }

    setIsAssigning(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/visits/update-visit/${currentVisit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            staff: assignStaffForm.staffId,
            notes: assignStaffForm.notes,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to assign staff");

      // const updatedVisit = await response.json();
      const staffName = staffList.find(s => s._id === assignStaffForm.staffId)?.fullname || "Staff not assigned";

      // Update the visit in state
      setVisits((prev) =>
        prev.map((visit) =>
          visit.id === currentVisit.id
            ? { ...visit, staffName, notes: assignStaffForm.notes }
            : visit
        )
      );

      toast.success("Staff assigned successfully");
      setIsAssignStaffOpen(false);
      setCurrentVisit(null);
      setAssignStaffForm({ staffId: "", notes: "" });
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast.error("Failed to assign staff");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenStatusModal = (visit: Visit) => {
    setCurrentVisit(visit);
    setStatusForm({
      status: visit.status,
      notes: "",
    });
    setIsStatusModalOpen(true);
  };

  const handleOpenAssignStaffModal = (visit: Visit) => {
    setCurrentVisit(visit);
    setAssignStaffForm({
      staffId: staffList.find((s) => s.fullname === visit.staffName)?._id || "",
      notes: visit.notes || "",
    });
    setIsAssignStaffOpen(true);
  };

  const handleStatusChange = async () => {
    if (!statusForm.status) {
      toast.error("Please select a status");
      return;
    }

    if (!currentVisit) return;
    setIsSubmitting(true);
    try {
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/visits/update-visit-status/${currentVisit.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(statusForm),
        }
      );

      if (!response.ok) throw new Error("Failed to update status");

      // Update the visit in state
      setVisits((prev) =>
        prev.map((visit) =>
          visit.id === currentVisit.id
            ? { ...visit, status: statusForm.status }
            : visit
        )
      );

      toast.success("Status updated successfully");
      setIsStatusModalOpen(false);
      setStatusForm({ status: "", notes: "" });
      setCurrentVisit(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Visit Management" />

      <div className="p-4">
        <div className="bg-white rounded-md shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by client, staff, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-[200px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setIsAddVisitOpen(true)}
              className="bg-[#0a1172] hover:bg-[#1a2182]"
            >
              + Add Visit
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Visit Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update Status</TableHead>
                  <TableHead>Assign Staff</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.length > 0 ? (
                  filteredVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="font-medium">
                        {String(visit.id).slice(-4)}
                      </TableCell>
                      <TableCell>{visit.clientName}</TableCell>
                      <TableCell>{visit.staffName}</TableCell>
                      <TableCell>
                        {new Date(visit.date).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>{visit.type}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusClass(
                            visit.status
                          )}`}
                        >
                          {visit.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenStatusModal(visit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenAssignStaffModal(visit)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentVisit(visit);
                              setIsViewVisitOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentVisit(visit);
                              setIsEditVisitOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setVisitToDelete(visit.id);
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      No visits found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, totalPages * pageSize)} of{" "}
                {totalPages * pageSize} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <span className="sr-only">Previous page</span>
                  &lt;
                </Button>
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant="outline"
                    size="sm"
                    className={`h-8 w-8 p-0 ${
                      page === pageNumber ? "bg-yellow-100" : ""
                    }`}
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  <span className="sr-only">Next page</span>
                  &gt;
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Visit Dialog */}
      <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] text-white p-1 rounded-full mr-2">
                <Eye className="h-5 w-5" />
              </div>
              Add New Visit
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="clientEmail" className="text-sm font-medium">
                Client Email
              </label>
              <Input
                id="clientEmail"
                value={addFormData.clientEmail}
                onChange={(e) => {
                  setAddFormData({
                    ...addFormData,
                    clientEmail: e.target.value,
                  });
                  clearFormError("clientEmail");
                }}
                placeholder="Enter client email"
                className={formErrors.clientEmail ? "border-red-500" : ""}
              />
              {formErrors.clientEmail && (
                <span className="text-red-500 text-xs">
                  {formErrors.clientEmail}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="staff" className="text-sm font-medium">
                Staff
              </label>
              <Select
                value={addFormData.staff}
                onValueChange={(value) => {
                  setAddFormData({ ...addFormData, staff: value });
                  clearFormError("staff");
                }}
              >
                <SelectTrigger
                  className={formErrors.staff ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {staff.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.staff && (
                <span className="text-red-500 text-xs">{formErrors.staff}</span>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="address" className="text-sm font-medium">
                Address
              </label>
              <Input
                id="address"
                value={addFormData.address}
                onChange={(e) => {
                  setAddFormData({ ...addFormData, address: e.target.value });
                  clearFormError("address");
                }}
                placeholder="Enter address"
                className={formErrors.address ? "border-red-500" : ""}
              />
              {formErrors.address && (
                <span className="text-red-500 text-xs">
                  {formErrors.address}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="date"
                type="date"
                value={addFormData.date}
                onChange={(e) => {
                  setAddFormData({ ...addFormData, date: e.target.value });
                  clearFormError("date");
                }}
                className={formErrors.date ? "border-red-500" : ""}
              />
              {formErrors.date && (
                <span className="text-red-500 text-xs">{formErrors.date}</span>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="time" className="text-sm font-medium">
                Time
              </label>
              <Input
                id="time"
                type="time"
                value={addFormData.time}
                onChange={(e) => {
                  setAddFormData({ ...addFormData, time: e.target.value });
                  clearFormError("time");
                }}
                className={formErrors.time ? "border-red-500" : ""}
              />
              {formErrors.time && (
                <span className="text-red-500 text-xs">{formErrors.time}</span>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="visitType" className="text-sm font-medium">
                Visit Type
              </label>
              <Select
                value={addFormData.type}
                onValueChange={(value) => {
                  setAddFormData({ ...addFormData, type: value });
                  clearFormError("type");
                }}
              >
                <SelectTrigger
                  className={formErrors.type ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select Visit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine check">Routine Check</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="follow up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.type && (
                <span className="text-red-500 text-xs">{formErrors.type}</span>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-[#0a1172] hover:bg-[#1a2182]"
              onClick={handleAddVisit}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Visit Dialog */}
      <Dialog open={isViewVisitOpen} onOpenChange={setIsViewVisitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] text-white p-1 rounded-full mr-2">
                <Eye className="h-5 w-5" />
              </div>
              Visit Details
            </DialogTitle>
          </DialogHeader>
          {currentVisit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Client:</span>
                <span className="text-sm">{currentVisit.clientName}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm">
                  {currentVisit.clientEmail || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Date & Time:</span>
                <span className="text-sm">
                  {new Date(currentVisit.date).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Staff:</span>
                <span className="text-sm">{currentVisit.staffName}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Address:</span>
                <span className="text-sm">{currentVisit.address || "N/A"}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Visit Type:</span>
                <span className="text-sm">{currentVisit.type}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Status:</span>
                <span
                  className={`text-sm px-2 py-1 rounded-full inline-block w-fit ${getStatusClass(
                    currentVisit.status
                  )}`}
                >
                  {currentVisit.status}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-sm font-medium">Notes:</span>
                <span className="text-sm">
                  {currentVisit.notes || "No notes available"}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <DialogClose asChild>
              <Button type="button" className="bg-[#0a1172] hover:bg-[#1a2182]">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={isEditVisitOpen} onOpenChange={setIsEditVisitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] text-white p-1 rounded-full mr-2">
                <Pencil className="h-5 w-5" />
              </div>
              Edit Visit
            </DialogTitle>
          </DialogHeader>
          {currentVisit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label
                  htmlFor="edit-clientEmail"
                  className="text-sm font-medium"
                >
                  Client Email
                </label>
                <Input
                  id="edit-clientEmail"
                  value={editFormData.clientEmail}
                  onChange={(e) => {
                    setEditFormData({
                      ...editFormData,
                      clientEmail: e.target.value,
                    });
                    clearFormError("clientEmail");
                  }}
                  placeholder="Enter client email"
                  className={formErrors.clientEmail ? "border-red-500" : ""}
                />
                {formErrors.clientEmail && (
                  <span className="text-red-500 text-xs">
                    {formErrors.clientEmail}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-staff" className="text-sm font-medium">
                  Staff
                </label>
                <Select
                  value={editFormData.staff}
                  onValueChange={(value) => {
                    setEditFormData({ ...editFormData, staff: value });
                    clearFormError("staff");
                  }}
                >
                  <SelectTrigger
                    className={formErrors.staff ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.fullname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.staff && (
                  <span className="text-red-500 text-xs">
                    {formErrors.staff}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-address" className="text-sm font-medium">
                  Address
                </label>
                <Input
                  id="edit-address"
                  value={editFormData.address}
                  onChange={(e) => {
                    setEditFormData({
                      ...editFormData,
                      address: e.target.value,
                    });
                    clearFormError("address");
                  }}
                  placeholder="Enter address"
                  className={formErrors.address ? "border-red-500" : ""}
                />
                {formErrors.address && (
                  <span className="text-red-500 text-xs">
                    {formErrors.address}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-date" className="text-sm font-medium">
                  Date
                </label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, date: e.target.value });
                    clearFormError("date");
                  }}
                  className={formErrors.date ? "border-red-500" : ""}
                />
                {formErrors.date && (
                  <span className="text-red-500 text-xs">
                    {formErrors.date}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-time" className="text-sm font-medium">
                  Time
                </label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editFormData.time}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, time: e.target.value });
                    clearFormError("time");
                  }}
                  className={formErrors.time ? "border-red-500" : ""}
                />
                {formErrors.time && (
                  <span className="text-red-500 text-xs">
                    {formErrors.time}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-visitType" className="text-sm font-medium">
                  Visit Type
                </label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value) => {
                    setEditFormData({ ...editFormData, type: value });
                    clearFormError("type");
                  }}
                >
                  <SelectTrigger
                    className={formErrors.type ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select Visit Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine check">Routine Check</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="follow up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.type && (
                  <span className="text-red-500 text-xs">
                    {formErrors.type}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-notes" className="text-sm font-medium">
                  Notes
                </label>
                <Input
                  id="edit-notes"
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  placeholder="Add notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentVisit(null)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-[#0a1172] hover:bg-[#1a2182]"
              onClick={handleEditVisit}
              disabled={isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] text-white p-1 rounded-full mr-2">
                <Trash2 className="h-5 w-5" />
              </div>
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              Are you sure you want to delete this visit? This action cannot be
              undone.
            </p>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisitToDelete(null)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteVisit}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Visit Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select
                value={statusForm.status}
                onValueChange={(value) =>
                  setStatusForm({ ...statusForm, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="notes"
                value={statusForm.notes}
                onChange={(e) =>
                  setStatusForm({ ...statusForm, notes: e.target.value })
                }
                placeholder="Add notes"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentVisit(null)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-[#0a1172] hover:bg-[#1a2182]"
              onClick={handleStatusChange}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={isAssignStaffOpen} onOpenChange={setIsAssignStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] text-white p-1 rounded-full mr-2">
                <UserPlus className="h-5 w-5" />
              </div>
              Assign Staff
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="staff" className="text-sm font-medium">
                Select Staff
              </label>
              <Select
                value={assignStaffForm.staffId}
                onValueChange={(value) =>
                  setAssignStaffForm({ ...assignStaffForm, staffId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {staff.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="assign-notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="assign-notes"
                value={assignStaffForm.notes}
                onChange={(e) =>
                  setAssignStaffForm({
                    ...assignStaffForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Add assignment notes..."
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentVisit(null)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-[#0a1172] hover:bg-[#1a2182]"
              onClick={handleAssignStaff}
              disabled={isAssigning}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
