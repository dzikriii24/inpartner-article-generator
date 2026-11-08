import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, CreditCard } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';

export const Simulator: React.FC = () => {
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSimulatePayment = async () => {
    setSubmitting(true);
    try {
      await api.post(`/payment/simulator/${number}/pay`);
      navigate(`/orders/${number}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <Card className="p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Simulator Payment Gateway</h1>
          <p className="text-xs text-slate-500 mt-1 font-supporting">Uji coba simulasi pembayaran Midtrans untuk pesanan: <span className="font-mono font-bold text-slate-800">{number}</span></p>
        </div>

        <Button
          onClick={handleSimulatePayment}
          disabled={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-xs py-3 gap-2 shadow-xs cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          {submitting ? 'Memproses Simulasi...' : 'Simulasi Pembayaran Sukses'}
        </Button>
      </Card>
    </div>
  );
};

export default Simulator;
