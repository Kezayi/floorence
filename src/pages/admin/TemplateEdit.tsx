import { useParams } from "react-router-dom";
import TemplateForm from "@/components/admin/TemplateForm";

const TemplateEdit = () => {
  const { id } = useParams();
  return <TemplateForm templateId={id} />;
};

export default TemplateEdit;
