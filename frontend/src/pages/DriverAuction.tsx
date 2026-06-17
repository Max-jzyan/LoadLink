import Col from "@/components/layout/Col";
import DynamicCard from "@/components/layout/DynamicCard";
import LayoutGrid from "@/components/layout/LayoutGrid";
import Row from "@/components/layout/Row";

export default function DriverAuctions() {
    return (
        <LayoutGrid>
            <Row size={16}>
                <Col size={7}>
                   <DynamicCard title="Toolbar" content={'Content will go here... eventually'} />
                </Col>
                <Col size={9}>
                    <DynamicCard title="Toolbar" content={'Content will go here... eventually'} />
                </Col>
\            </Row>
        </LayoutGrid>
    )
}