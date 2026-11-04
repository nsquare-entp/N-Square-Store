import { CartItem } from '../store/useCartStore';

export const generateWhatsAppMessageText = (items: CartItem[]) => {
  if (items.length === 0) return "";

  let message = "Hi! I am interested in getting guidance and potentially ordering the following products:\n\n";
  
  items.forEach((item, index) => {
    message += `${index + 1}. ${item.name} (Qty: ${item.qty})\n`;
  });
  
  const totalPrice = items.reduce((total, item) => total + (item.price * item.qty), 0);
  
  message += `\n*Estimated Total (Direct Selling Price): ₹${totalPrice.toLocaleString('en-IN')}*\n\n`;
  message += "Please let me know how I can proceed. Thank you!";
  
  return message;
};

export const generateWhatsAppLink = (
  items: CartItem[], 
  businessNumber: string = "917093859526"
) => {
  const message = generateWhatsAppMessageText(items);
  if (!message) return "#";
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${businessNumber}?text=${encodedMessage}`;
};
