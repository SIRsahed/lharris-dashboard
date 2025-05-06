"use client";

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Check, Plus, Pencil, Trash, Eye, Download } from "lucide-react"
import { getActivePlans, getMonthlyRevenue, getActiveDiscounts, addPlan, getAllPlans, deletePlan, updatePlan, setAuthToken } from "@/lib/api"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useSession } from "next-auth/react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { cn } from "@/lib/utils"
import PaginationComponent from "./pagination"
import { PaymentDetailsModal } from "./payment-details-modal"
import { generatePaymentPDF } from "@/lib/generate-pdf"
import QuillEditor from "./QuillEditor"

interface Plan {
  _id: string;
  name: string;
  price: number;
  description: string;
  pack?: string;
  addsOnServices?: Array<{
    text: string;
    _id: string;
    addOn: string;
    price: number;
    startDate: string | null;
    endDate: string | null;
  }>;
}

interface Payment {
  amount: number;
  createdAt: string;
  formattedAmount: string;
  id: string;
  paymentDate: string;
  paymentMethod: string;
  plan: {
    _id: string;
    name: string
  };
  status: string;
  transactionId: string;
  user: string;
  visit: string;
}

interface Payments {
  data: Payment[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Plan name must be at least 2 characters." }),
  price: z.number().min(0, { message: "Price must be a positive number." }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters." }),
  pack: z.enum(["weekly", "monthly", "daily"]),
});

type FormData = z.infer<typeof formSchema>;

export function PricingPage() {
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
  const [isDeletePackageOpen, setIsDeletePackageOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState("plans");



  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  useEffect(() => {
    if (token) {
      setAuthToken(token); // Set the token when it becomes available
    }
  }, [token]);




  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handleViewPaymentDetails = (payment: any) => {
    setSelectedPayment(payment)
    setIsModalOpen(true)
  }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handleDownloadPaymentDetails = (payment: any) => {
    try {
      const doc = generatePaymentPDF(payment);

      // Generate filename with transaction ID
      const filename = `payment-receipt-${payment.transactionId}.pdf`;

      // Save the PDF
      doc.save(filename);

      toast.success("Payment receipt downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to download payment receipt");
    }
  };

  const [payments, setPayments] = useState<Payments>({
    data: [],
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0,
      totalPages: 0,
    },
  });

  const [metrics, setMetrics] = useState({
    activePlans: 0,
    monthlyRevenue: 0,
    activeDiscounts: 0,
  });
  const [plans, setPlans] = useState<Plan[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      pack: "daily",
    },
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [
          activePlansRes,
          monthlyRevenueRes,
          activeDiscountsRes,
          plansRes,
        ] = await Promise.all([
          getActivePlans().catch(() => ({ totalActivePlans: 0 })),
          getMonthlyRevenue().catch(() => ({ monthlyRevenue: 0 })),
          getActiveDiscounts().catch(() => ({ activeDiscounts: 0 })),
          getAllPlans().catch(() => ({ data: [] })),
        ]);

        setMetrics({
          activePlans: activePlansRes.totalActivePlans || 0,
          monthlyRevenue: monthlyRevenueRes.monthlyRevenue || 0,
          activeDiscounts: activeDiscountsRes.activeDiscounts || 0,
        });

        if (plansRes.data && Array.isArray(plansRes.data)) {
          setPlans(plansRes.data);
        }
      } catch (error) {
        console.error("Error fetching billing metrics:", error);
        toast.error("Failed to load billing metrics");
      }
    }
    if (token) {
      fetchMetrics();
    }
  }, [token])

  const handleAddPackage = async (data: FormData) => {
    try {
      await addPlan(data);
      toast.success("Package added successfully");
      setIsAddPackageOpen(false);
      // Refresh plans
      const plansRes = await getAllPlans();
      if (plansRes.data && Array.isArray(plansRes.data)) {
        setPlans(plansRes.data);
      }
      form.reset();
    } catch (error) {
      console.error("Error adding plan:", error);
      toast.error("Failed to add package");
    }
  };

  const handleDeletePlan = async () => {
    try {
      await deletePlan(selectedPlanId);
      toast.success("Plan deleted successfully");
      setIsDeletePackageOpen(false);
      setPlans((prevPlans) =>
        prevPlans.filter((plan) => plan._id !== selectedPlanId)
      );
      setSelectedPlanId("");
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  const handleEditPlan = async (data: FormData) => {
    try {
      // Ensure description is properly sanitized if needed
      const updateData = {
        ...data,
        description: data.description || "", // Ensure description exists
      };

      await updatePlan(selectedPlanId, updateData);
      toast.success("Plan updated successfully");
      setIsEditPackageOpen(false);

      // Refresh plans
      const plansRes = await getAllPlans();
      if (plansRes.data && Array.isArray(plansRes.data)) {
        setPlans(plansRes.data);
      }

      // Reset the form after successful update
      form.reset();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan");
    }
  };

  const handleEditClick = (plan: Plan) => {
    setSelectedPlanId(plan._id);
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      price: plan.price,
      description: plan.description,
      pack: plan.pack as "weekly" | "monthly" | "daily",
    });
    setIsEditPackageOpen(true);
  };


  const getPayments = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/payments/all?page=${page}&limit=${limit}`,
      {
        method: "GET",
      }
    );

    const data = await res.json();
    return setPayments(data);
  }


  useEffect(() => {
    getPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  console.log(payments)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Billing"
        subtitle="Manage pricing plans and discounts"
      />

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-600 flex items-center">
                <Check className="h-4 w-4 mr-1" /> Total Active Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{plans.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-600 flex items-center">
                <Check className="h-4 w-4 mr-1" /> Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${metrics.monthlyRevenue}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="plans" onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-white py-7 rounded-full gap-5">
              <TabsTrigger
                value="plans"
                className="data-[state=active]:bg-[#091057] py-3 px-7 rounded-3xl data-[state=active]:text-[#F7E39F]"
              >
                Security Plans
              </TabsTrigger>
              <TabsTrigger
                value="payment-history"
                className="data-[state=active]:bg-[#091057] py-3 px-7 rounded-3xl data-[state=active]:text-[#F7E39F]"
              >
                Payment History
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button
                className="bg-[#0a1172] hover:bg-[#1a2182] data-[state=active]:flex"
                data-state={activeTab === "plans" ? "active" : "inactive"}
                onClick={() => setIsAddPackageOpen(true)}
              >
                + Add Plans
              </Button>
            </div>
          </div>

          <TabsContent value="plans" className="mt-0">
            <div className="bg-white rounded-md shadow-sm p-6">
              <div className="">
                <h3 className="text-lg font-semibold pb-7 pl-1 text-[#18181B]">
                  Plans
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <Card key={plan._id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between">
                          <span className="capitalize text-2xl pb-7">
                            {plan.name}
                          </span>
                        </CardTitle>
                        <CardDescription className="text-lg font-semibold text-[#000000] capitalize">
                          ${plan.price} / {plan.pack}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="">
                          <h3>Features: </h3>
                        </div>
                        <div
                          className="list-item list-none"
                          dangerouslySetInnerHTML={{
                            __html: plan?.description || "Plan Description",
                          }}
                        />
                      </CardContent>
                      <CardFooter className="flex items-center gap-2 text-base">
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsEditPackageOpen(true);
                            setSelectedPlanId(plan._id);
                            handleEditClick(plan);
                          }}
                          className="bg-[#091057] text-[#F7E39F]"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsDeletePackageOpen(true);
                            setSelectedPlanId(plan._id);
                          }}
                          className="hover:bg-[#1a2182] bg-transparent border border-[#091057] text-[#091057] hover:text-[#F7E39F]"
                        >
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div>No plans found</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment-history" className="mt-0">
            <div className="space-y-6">
              <div className="rounded-md border overflow-hidden">
                {payments?.data?.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No payments found.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px] pl-10">
                            Transaction ID
                          </TableHead>
                          <TableHead className="text-center">Date</TableHead>
                          <TableHead className="text-center">
                            Visit Time
                          </TableHead>
                          <TableHead className="text-center">Amount</TableHead>
                          <TableHead className="text-center">Plan</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments?.data?.map((item: Payment) => (
                          <TableRow key={item.id} className="text-center">
                            <TableCell className="font-medium pl-3 text-start">
                              {item.transactionId}
                            </TableCell>
                            <TableCell>
                              {new Date(item.paymentDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(item.paymentDate).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </TableCell>
                            <TableCell>{item.formattedAmount}</TableCell>
                            <TableCell className="capitalize">
                              {item?.plan?.name || "N/A"}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <span
                                className={cn(
                                  "px-2 py-1 rounded-full text-xs font-medium",
                                  {
                                    "bg-[#B3E9C9] text-[#033618]":
                                      item?.status === "completed",
                                    "bg-[#FFD6D6] text-[#5C0000]":
                                      item?.status === "failed",
                                    "bg-[#FFF3CD] text-[#856404]":
                                      item?.status === "pending",
                                    "bg-[#CCE5FF] text-[#004085]":
                                      item?.status === "refunded",
                                  }
                                )}
                              >
                                {item?.status === "completed"
                                  ? "Paid"
                                  : item?.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewPaymentDetails(item)}
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">
                                    View payment details
                                  </span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleDownloadPaymentDetails(item)
                                  }
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">
                                    Download payment receipt
                                  </span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <PaginationComponent
                      totalItems={payments?.pagination?.totalItems}
                      itemsPerPage={payments?.pagination?.itemsPerPage}
                      currentPage={payments?.pagination?.currentPage}
                      totalPages={payments?.pagination?.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>

              <PaymentDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                payment={selectedPayment}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Package Dialog */}
      <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] text-white p-1 rounded-full mr-2">
                <Plus className="h-5 w-5" />
              </div>
              Add New Plan
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddPackage)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter package name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <div className="border rounded-md">
                        <QuillEditor
                          id="description"
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pack</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a billing period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-[#0a1172] hover:bg-[#1a2182]"
                >
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={isEditPackageOpen} onOpenChange={setIsEditPackageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] text-white p-1 rounded-full mr-2">
                <Pencil className="h-5 w-5" />
              </div>
              Edit Plan: {editingPlan?.name}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEditPlan)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={editingPlan?.name || "Enter package name"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <div className="border rounded-md">
                        <QuillEditor
                          id="description"
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pack</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a billing period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-[#0a1172] hover:bg-[#1a2182]"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Package Dialog */}
      <Dialog open={isDeletePackageOpen} onOpenChange={setIsDeletePackageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="bg-[#0a1172] mb-5 text-white p-1 rounded-full mr-2">
                <Trash className="h-6 w-6" />
              </div>
              Are you sure you want to delete this package?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-[#0a1172] hover:bg-[#1a2182]"
              onClick={handleDeletePlan}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
