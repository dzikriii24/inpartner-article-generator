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
    <div className="max-w-md mx-auto py-12 px-4">
      <Card className="p-8 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-md rounded-3xl space-y-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900">Simulator Payment Gateway</h1>
          <p className="text-xs text-zinc-500 mt-1">Uji coba simulasi pembayaran Midtrans untuk pesanan: <span className="font-mono font-bold text-zinc-800">{number}</span></p>
        </div>

        <Button
          onClick={handleSimulatePayment}
          disabled={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs py-3 gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {submitting ? 'Memproses Simulasi...' : 'Simulasi Pembayaran Sukses'}
        </Button>
      </Card>
    </div>
  );
};

export default Simulator;
