"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { 
    Users, 
    Video, 
    CreditCard, 
    CheckCircle2, 
    Loader2,
    Type
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  total_users: number;
  total_videos_created: number;
  total_videos_completed: number;
  total_revenue_usd: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  videos_generated: number;
  joined_date: string;
  latest_payment?: {
    amount: number;
    date?: string;
    createdAt?: string;
  };
}

interface AdminPayment {
  _id?: string;
  id?: string;
  type?: string;
  payer_name?: string;
  phone_number?: string;
  user_id?: string;
  amount?: number;
  currency?: string;
  plan_name?: string;
  status?: string;
  createdAt?: string;
  date?: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    stats: AdminStats;
    users: AdminUser[];
    payments_history: AdminPayment[];
  } | null>(null);

  useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/admin/dashboard");
                setData(res.data);
            } catch (error) {
                console.error("Failed to load admin data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-red-500">
                Failed to load admin dashboard. Ensure backend is running.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col">
            <div className="absolute inset-0 bg-purple-900/10 blur-[120px] pointer-events-none" />

            {/* Navigation */}
            <nav className="border-b border-white/10 bg-black/50 z-10 sticky top-0">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
                                <Type className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight hidden md:inline-block">TypeMotion</span>
                        </Link>
                        <div className="h-6 w-px bg-white/20 mx-2" />
                        <span className="font-medium text-lg text-purple-400">Admin Console</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <Link href="/dashboard" className="hover:text-white transition-colors">
                            Exit Admin
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 container mx-auto px-4 py-8 relative z-10 w-full max-w-7xl space-y-8">
                
                {/* Top Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-gray-900/50 border-white/10 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                            <Users className="w-4 h-4 text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{data.stats.total_users}</div>
                            <p className="text-xs text-gray-500 mt-1">Registered accounts</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-white/10 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
                            <CreditCard className="w-4 h-4 text-green-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">${data.stats.total_revenue_usd.toFixed(2)}</div>
                            <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-white/10 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">Videos Generated</CardTitle>
                            <Video className="w-4 h-4 text-purple-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{data.stats.total_videos_created}</div>
                            <p className="text-xs text-gray-500 mt-1">Videos requested</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-white/10 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">Completion Rate</CardTitle>
                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">
                                {data.stats.total_videos_created > 0 
                                    ? Math.round((data.stats.total_videos_completed / data.stats.total_videos_created) * 100) 
                                    : 0}%
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{data.stats.total_videos_completed} successfully rendered</p>
                        </CardContent>
                    </Card>
                </div>

                {/* User / Video Management Table */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        User Management & Subscriptions
                    </h2>
                    <div className="rounded-xl border border-white/10 overflow-hidden bg-gray-900/30 backdrop-blur-md">
                        <Table>
                            <TableHeader className="bg-black/40">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-gray-400">User Details</TableHead>
                                    <TableHead className="text-gray-400">Subscription Plan</TableHead>
                                    <TableHead className="text-gray-400">Videos Generated</TableHead>
                                    <TableHead className="text-gray-400">Joined Date</TableHead>
                                    <TableHead className="text-gray-400 text-right">Latest Payment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.users.map((user) => (
                                    <TableRow key={user.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                        <TableCell>
                                            <div className="font-medium text-gray-200">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`bg-transparent ${user.plan.includes('Pro') ? 'border-purple-500 text-purple-400' : 'border-gray-500 text-gray-400'}`}>
                                                {user.plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{user.videos_generated}</span>
                                                <span className="text-xs text-gray-500">videos</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-400">
                                            {new Date(user.joined_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.latest_payment ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-green-400 font-medium">
                                                        ${user.latest_payment.amount.toFixed(2)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(user.latest_payment.date ?? user.latest_payment.createdAt ?? "").toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 text-sm">No Payments</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Global Payment History */}
                <div className="space-y-4 pt-8">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-green-400" />
                        Global Transaction History
                    </h2>
                    <div className="rounded-xl border border-white/10 overflow-hidden bg-gray-900/30 backdrop-blur-md">
                        <Table>
                            <TableHeader className="bg-black/40">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Transaction/Request ID</TableHead>
                                    <TableHead className="text-gray-400">User Details</TableHead>
                                    <TableHead className="text-gray-400">Amount / Info</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.payments_history.map((payment) => (
                                    <TableRow key={payment._id || payment.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                        <TableCell className="font-mono text-xs text-gray-400">{payment._id || payment.id}</TableCell>
                                        <TableCell className="text-gray-300">
                                            {payment.type === 'payment' ? (
                                                <>
                                                    <div><span className="text-gray-500 text-xs">Name:</span> {payment.payer_name}</div>
                                                    <div><span className="text-gray-500 text-xs">Phone:</span> {payment.phone_number}</div>
                                                    <div className="text-xs mt-1 text-gray-500">User ID: {payment.user_id}</div>
                                                </>
                                            ) : (
                                                <div className="text-gray-300">User #{payment.user_id}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-semibold text-green-400">
                                            {payment.type === 'payment' ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-gray-200">${payment.amount?.toFixed(2) || '0.00'}</span>
                                                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-xs py-0">
                                                        {payment.plan_name || 'Legacy Plan'}
                                                    </Badge>
                                                </div>
                                            ) : `$${payment.amount?.toFixed(2) || '0.00'} ${payment.currency}`}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`bg-opacity-10 ${payment.status === 'Completed' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'}`}>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-gray-400">
                                            {new Date(payment.createdAt ?? payment.date ?? "").toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

            </main>
        </div>
    );
}
